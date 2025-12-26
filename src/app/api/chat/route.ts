import { streamText, APICallError, type ModelMessage } from 'ai'
import { getLanguageModel, getWebSearchTools, isOpenAIReasoningModel } from '@/lib/ai/providers'
import { sanitizeInput, validateApiKey, containsDangerousPatterns } from '@/lib/ai/sanitize'
import { AI_MODELS, VALID_THINKING_LEVELS, type AIProvider, type ThinkingLevel } from '@/types/ai'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isValidProvider } from '@/lib/api-key-validation'

function isValidThinkingLevel(level: unknown): level is ThinkingLevel {
  return typeof level === 'string' && VALID_THINKING_LEVELS.includes(level as ThinkingLevel)
}

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

// Maximum number of images per request to prevent DoS
// Must match client-side limit in chat-input.tsx for consistent UX
const MAX_IMAGES_PER_REQUEST = 4

// Maximum total image size per request (20MB) to prevent memory exhaustion
// NOTE: These limits are enforced across ALL messages in a request
const MAX_TOTAL_IMAGE_SIZE_BYTES = 20 * 1024 * 1024

type ImageRejectionReason =
  | 'invalid_data_url'
  | 'image_too_large'
  | 'max_images_per_request_exceeded'
  | 'max_total_image_size_exceeded'
  | 'unsupported_mime_type'

type ImageRejectionSource = 'attachment' | 'content'

interface ImageRejection {
  messageIndex: number
  source: ImageRejectionSource
  reason: ImageRejectionReason
  attachmentName?: string
  attachmentIndex?: number
  partIndex?: number
  mimeType?: string | null
  sizeBytes?: number
}

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

// Get estimated size of base64 data URL
function getDataUrlSize(url: string): number {
  const base64Index = url.indexOf(';base64,')
  if (base64Index === -1) return 0
  const base64Data = url.slice(base64Index + 8).replace(/\s/g, '')
  const paddingMatch = base64Data.match(/=+$/)
  const paddingCount = paddingMatch ? paddingMatch[0].length : 0
  const effectiveLength = base64Data.length
  // base64 encodes 3 bytes into 4 characters; adjust for trailing padding
  return (effectiveLength * 3) / 4 - paddingCount
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

// Type guard for valid attachment
function isValidAttachment(attachment: unknown): attachment is Attachment {
  if (typeof attachment !== 'object' || attachment === null) return false
  const a = attachment as Record<string, unknown>
  return (
    typeof a.name === 'string' &&
    typeof a.contentType === 'string' &&
    typeof a.url === 'string'
  )
}

// Validate message structure
function isValidMessage(msg: unknown): msg is ChatMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>

  // Role must be allowed (user or assistant only)
  if (!isAllowedRole(m.role)) return false

  // Content must be string or array of valid parts
  const hasValidContent =
    typeof m.content === 'string' ||
    (Array.isArray(m.content) && m.content.every(isValidContentPart))
  if (!hasValidContent) return false

  // experimental_attachments must be undefined or array of valid attachments
  // This prevents .entries() from throwing on non-array types
  if (m.experimental_attachments !== undefined) {
    if (!Array.isArray(m.experimental_attachments)) return false
    if (!m.experimental_attachments.every(isValidAttachment)) return false
  }

  return true
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

  // Parse JSON body with explicit error handling for invalid JSON
  let body: unknown
  try {
    body = await req.json()
  } catch {
    // Invalid JSON should return 400 Bad Request, not 500
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Validate body is a non-null object before destructuring
    // Arrays and null are valid JSON but not valid request bodies
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: 'Request body must be a JSON object' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Type assertion after JSON parsing - validation follows
    const {
      messages,
      modelId,
      provider,
      apiKey,
      thinkingLevel,
      webSearchEnabled,
    } = body as {
      messages: ChatMessage[]
      modelId: string
      provider: AIProvider
      apiKey: string
      thinkingLevel?: ThinkingLevel
      webSearchEnabled?: boolean
    }

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
    // Track image count and size across ALL messages in the request (DoS prevention)
    let requestImageCount = 0
    let requestTotalImageSize = 0
    const imageRejections: ImageRejection[] = []

    const processedMessages: ModelMessage[] = validatedMessages.map((message, messageIndex) => {
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
        
        for (const [attachmentIndex, attachment] of attachments.entries()) {
          const rejectionBase = {
            messageIndex,
            source: 'attachment' as const,
            attachmentName: attachment.name,
            attachmentIndex,
          }

          // Validate data URL format first
          if (!isValidImageDataUrl(attachment.url)) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'invalid_data_url',
            })
            continue
          }
          
          // Calculate size once for efficiency
          const imageSize = getDataUrlSize(attachment.url)
          
          // Check individual image size limit
          if (imageSize > MAX_IMAGE_SIZE_BYTES) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'image_too_large',
              sizeBytes: imageSize,
            })
            continue
          }
          
          // Check request-level limits
          if (requestImageCount >= MAX_IMAGES_PER_REQUEST) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'max_images_per_request_exceeded',
            })
            continue
          }
          if (requestTotalImageSize + imageSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'max_total_image_size_exceeded',
              sizeBytes: imageSize,
            })
            continue
          }
          
          // Validate MIME type (don't trust client contentType)
          const actualMimeType = getDataUrlMimeType(attachment.url)
          if (!actualMimeType || !ALLOWED_IMAGE_TYPES.includes(actualMimeType as typeof ALLOWED_IMAGE_TYPES[number])) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'unsupported_mime_type',
              mimeType: actualMimeType,
            })
            continue
          }
          
          // All checks passed - add the image
          requestImageCount++
          requestTotalImageSize += imageSize
          parts.push({ type: 'image', image: attachment.url })
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
        } as ModelMessage
      }

      // Regular text message
      if (typeof message.content === 'string') {
        return {
          role: message.role,
          content: sanitizeInput(message.content),
        } as ModelMessage
      }

      // Already multimodal content - sanitize text parts and validate image parts
      // Apply same request-level limits as experimental_attachments path
      const sanitizedContent: ContentPart[] = []
      
      for (const [partIndex, part] of message.content.entries()) {
        if (part.type === 'text') {
          sanitizedContent.push({ ...part, text: sanitizeInput(part.text) })
          continue
        }
        
        // Validate image parts with same rules as attachments
        if (part.type === 'image') {
          const rejectionBase = {
            messageIndex,
            source: 'content' as const,
            partIndex,
          }

          // Validate data URL format first
          if (!isValidImageDataUrl(part.image)) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'invalid_data_url',
            })
            continue
          }
          
          // Calculate size once for efficiency
          const imageSize = getDataUrlSize(part.image)
          
          // Check individual image size limit
          if (imageSize > MAX_IMAGE_SIZE_BYTES) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'image_too_large',
              sizeBytes: imageSize,
            })
            continue
          }
          
          // Check request-level limits (shared with experimental_attachments)
          if (requestImageCount >= MAX_IMAGES_PER_REQUEST) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'max_images_per_request_exceeded',
            })
            continue
          }
          if (requestTotalImageSize + imageSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'max_total_image_size_exceeded',
              sizeBytes: imageSize,
            })
            continue
          }
          
          // Validate MIME type
          const actualMimeType = getDataUrlMimeType(part.image)
          if (!actualMimeType || !ALLOWED_IMAGE_TYPES.includes(actualMimeType as typeof ALLOWED_IMAGE_TYPES[number])) {
            imageRejections.push({
              ...rejectionBase,
              reason: 'unsupported_mime_type',
              mimeType: actualMimeType,
            })
            continue
          }
          
          // All checks passed - add the image
          requestImageCount++
          requestTotalImageSize += imageSize
          sanitizedContent.push(part)
        }
      }

      // Fallback: if all parts got filtered out, add empty text part
      // AI SDK may error on empty content array
      if (sanitizedContent.length === 0) {
        sanitizedContent.push({ type: 'text', text: '' })
      }

      return {
        role: message.role,
        content: sanitizedContent,
      } as ModelMessage
    })

    // Pass webSearchEnabled to getLanguageModel (handles Google search grounding)
    const model = getLanguageModel(provider, modelId, apiKey, {
      webSearchEnabled: webSearchEnabled === true,
    })

    // Get web search tools for all providers (OpenAI, Anthropic, Google)
    // All providers use tool-based search in AI SDK v6
    const webSearchTools = webSearchEnabled === true
      ? getWebSearchTools(provider, apiKey)
      : undefined

    // Log image rejections for debugging (AI SDK v6 removed StreamData)
    if (imageRejections.length > 0) {
      console.warn('Image rejections:', imageRejections)
    }

    // Check if this is an OpenAI reasoning model (requires special configuration)
    const isReasoningModel = provider === 'openai' && isOpenAIReasoningModel(modelId)

    // Use client-specified thinking level if valid, otherwise default to 'medium'
    const effectiveThinkingLevel: ThinkingLevel = isValidThinkingLevel(thinkingLevel)
      ? thinkingLevel
      : 'medium'

    const result = streamText({
      model,
      messages: processedMessages,
      // Add web search tools for OpenAI and Anthropic when enabled
      ...(webSearchTools && { tools: webSearchTools }),
      // Configure reasoning effort for OpenAI reasoning models
      // Uses client-specified level for customizable thinking depth
      ...(isReasoningModel && {
        providerOptions: {
          openai: {
            reasoningEffort: effectiveThinkingLevel,
          },
        },
      }),
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)

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
