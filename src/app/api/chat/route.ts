import { streamText, APICallError, type CoreMessage } from 'ai'
import { getLanguageModel } from '@/lib/ai/providers'
import { sanitizeInput, validateApiKey, containsDangerousPatterns } from '@/lib/ai/sanitize'
import { AI_MODELS, type AIProvider } from '@/types/ai'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isValidProvider } from '@/lib/api-key-validation'

// Use Node.js runtime for better base64 image handling
// Edge Runtime has known issues with base64 image processing
export const runtime = 'nodejs'

// Multimodal content part types
interface TextPart {
  type: 'text'
  text: string
}

interface ImagePart {
  type: 'image'
  image: string // base64 data URL
}

type ContentPart = TextPart | ImagePart

interface Attachment {
  name: string
  contentType: string
  url: string // data URL (base64)
}

// Allowed image MIME types for security validation
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'] as const

// Maximum image size (10MB) - must match client-side limit for consistency
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

// Rate limit: 30 requests per minute per IP for chat API
const CHAT_RATE_LIMIT_CONFIG = {
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
}

// Validate and extract MIME type from data URL
function isValidImageDataUrl(url: string): boolean {
  return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(url)
}

function getDataUrlMimeType(url: string): string | null {
  const match = url.match(/^data:([^;]+);base64,/)
  return match?.[1] ?? null
}

// Validate base64 data URL size to prevent DoS attacks
function isDataUrlWithinSizeLimit(url: string): boolean {
  const base64Index = url.indexOf(';base64,')
  if (base64Index === -1) return false
  const base64Data = url.slice(base64Index + 8)
  // base64 encodes 3 bytes into 4 characters
  const estimatedSize = (base64Data.length * 3) / 4
  return estimatedSize <= MAX_IMAGE_SIZE_BYTES
}

// Allowed message roles (system role is NOT allowed from client to prevent prompt injection)
const ALLOWED_ROLES = ['user', 'assistant'] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

// Type guard for allowed roles
function isAllowedRole(role: unknown): role is AllowedRole {
  return typeof role === 'string' && ALLOWED_ROLES.includes(role as AllowedRole)
}

// Type guard for valid content part
function isValidContentPart(part: unknown): part is ContentPart {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>
  if (p.type === 'text' && typeof p.text === 'string') return true
  if (p.type === 'image' && typeof p.image === 'string') return true
  return false
}

// Validate message structure
function isValidMessage(msg: unknown): msg is ChatMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  
  // Role must be allowed (user or assistant only)
  if (!isAllowedRole(m.role)) return false
  
  // Content must be string or array of valid parts
  if (typeof m.content === 'string') return true
  if (Array.isArray(m.content)) {
    return m.content.every(isValidContentPart)
  }
  return false
}

interface ChatMessage {
  role: AllowedRole
  content: string | ContentPart[]
  experimental_attachments?: Attachment[]
}

export async function POST(req: Request) {
  // Rate limiting check
  const clientIp = getClientIp(req)
  const rateLimitResult = checkRateLimit(`chat:${clientIp}`, CHAT_RATE_LIMIT_CONFIG)

  if (!rateLimitResult.success) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
        },
      }
    )
  }

  try {
    const body = await req.json()

    const {
      messages,
      modelId,
      provider,
      apiKey,
    }: {
      messages: ChatMessage[]
      modelId: string
      provider: AIProvider
      apiKey: string
    } = body

    if (!validateApiKey(apiKey)) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate message structure and filter out system role (prevent prompt injection)
    // This is a critical security check - system role from client could manipulate AI behavior
    const validatedMessages: ChatMessage[] = []
    for (const msg of messages) {
      if (!isValidMessage(msg)) {
        return new Response(
          JSON.stringify({ error: 'Invalid message format: each message must have a valid role (user/assistant) and content (string or content parts array)' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      validatedMessages.push(msg)
    }

    if (validatedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!modelId || !provider) {
      return new Response(JSON.stringify({ error: 'Model ID and provider are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate provider is in allowlist
    if (!isValidProvider(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate model exists and matches provider
    const validModel = AI_MODELS.find((m) => m.id === modelId && m.provider === provider)
    if (!validModel) {
      return new Response(JSON.stringify({ error: 'Invalid model for this provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check for prompt injection attempts in user messages (text content only)
    const userMessages = validatedMessages.filter((m) => m.role === 'user')
    for (const message of userMessages) {
      const textContent = typeof message.content === 'string'
        ? message.content
        : message.content.filter((p): p is TextPart => p.type === 'text').map(p => p.text).join(' ')

      if (containsDangerousPatterns(textContent)) {
        return new Response(
          JSON.stringify({ error: 'Message contains disallowed content' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Process messages to handle multimodal content (experimental_attachments)
    const processedMessages: CoreMessage[] = validatedMessages.map((message) => {
      const hasMessageAttachments = message.experimental_attachments && message.experimental_attachments.length > 0

      // If message has attachments, create multimodal content
      if (hasMessageAttachments && message.role === 'user') {
        const parts: ContentPart[] = []

        // Add text content first
        if (typeof message.content === 'string' && message.content.trim()) {
          parts.push({ type: 'text', text: sanitizeInput(message.content) })
        }

        // Add images from experimental_attachments with validation
        const attachments = message.experimental_attachments ?? []
        for (const attachment of attachments) {
          // Validate data URL format, size limit, and MIME type (don't trust client contentType)
          if (isValidImageDataUrl(attachment.url) && isDataUrlWithinSizeLimit(attachment.url)) {
            const actualMimeType = getDataUrlMimeType(attachment.url)
            if (actualMimeType && ALLOWED_IMAGE_TYPES.includes(actualMimeType as typeof ALLOWED_IMAGE_TYPES[number])) {
              parts.push({ type: 'image', image: attachment.url })
            }
          }
        }

        // Fallback: if all attachments failed validation and no text, add empty text part
        // AI SDK may error on empty content array
        if (parts.length === 0) {
          const sanitizedContent = typeof message.content === 'string' ? sanitizeInput(message.content) : ''
          parts.push({ type: 'text', text: sanitizedContent })
        }

        return {
          role: message.role,
          content: parts,
        } as CoreMessage
      }

      // Regular text message
      if (typeof message.content === 'string') {
        return {
          role: message.role,
          content: sanitizeInput(message.content),
        } as CoreMessage
      }

      // Already multimodal content - sanitize text parts and validate image parts
      const sanitizedContent = message.content
        .map((part) => {
          if (part.type === 'text') {
            return { ...part, text: sanitizeInput(part.text) }
          }
          // Validate image parts with same rules as attachments (format, size, MIME type)
          if (part.type === 'image') {
            if (!isValidImageDataUrl(part.image) || !isDataUrlWithinSizeLimit(part.image)) {
              return null // Skip invalid or oversized data URLs
            }
            const actualMimeType = getDataUrlMimeType(part.image)
            if (!actualMimeType || !ALLOWED_IMAGE_TYPES.includes(actualMimeType as typeof ALLOWED_IMAGE_TYPES[number])) {
              return null // Skip disallowed MIME types
            }
          }
          return part
        })
        .filter((part): part is ContentPart => part !== null)

      // Fallback: if all parts got filtered out, add empty text part
      // AI SDK may error on empty content array
      if (sanitizedContent.length === 0) {
        sanitizedContent.push({ type: 'text', text: '' })
      }

      return {
        role: message.role,
        content: sanitizedContent,
      } as CoreMessage
    })

    const model = getLanguageModel(provider, modelId, apiKey)

    const result = streamText({
      model,
      messages: processedMessages,
    })

    return result.toDataStreamResponse()
  } catch (error) {

    // Use APICallError.isInstance() for type-safe error handling
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 401) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (error.statusCode === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Return the actual status code from the API error
      return new Response(
        JSON.stringify({ error: error.message || 'API error occurred' }),
        { status: error.statusCode ?? 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
