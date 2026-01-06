import { streamText, APICallError, convertToModelMessages, type UIMessage } from 'ai'
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

// Maximum ceiling for all requests handled by this route: up to 5 minutes.
// This higher limit is primarily to support reasoning models (o1, o3, gpt-5.2-pro),
// which can spend significant time "thinking" before responding. Non-reasoning
// models also use this ceiling but typically complete much sooner.
// Rate limiting (30 req/min per IP) helps mitigate resource exhaustion risks.
export const maxDuration = 300

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

// Whitelist of allowed part types for security (prevent unknown types from causing issues)
const ALLOWED_PART_TYPES = ['text', 'image', 'file', 'tool-invocation', 'tool-result'] as const

// Maximum text length per part to prevent DoS (100KB per text part)
const MAX_TEXT_PART_LENGTH = 100 * 1024

// Maximum parts array length to prevent memory exhaustion
const MAX_PARTS_PER_MESSAGE = 50

// Validate message structure for AI SDK v6 UIMessage format
function isValidUIMessage(msg: unknown): boolean {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>

  // Role must be allowed (user or assistant only)
  if (!isAllowedRole(m.role)) return false

  // Must have parts array (AI SDK v6 format)
  if (!Array.isArray(m.parts)) return false

  // Limit parts array length to prevent DoS
  if (m.parts.length > MAX_PARTS_PER_MESSAGE) return false

  // Validate each part with strict type checking
  for (const part of m.parts) {
    if (typeof part !== 'object' || part === null) return false
    const p = part as Record<string, unknown>

    // Type must be a string and in whitelist
    if (typeof p.type !== 'string') return false
    if (!ALLOWED_PART_TYPES.includes(p.type as typeof ALLOWED_PART_TYPES[number])) return false

    // For text parts, validate text is a string with size limit
    if (p.type === 'text') {
      if (typeof p.text !== 'string') return false
      if (p.text.length > MAX_TEXT_PART_LENGTH) return false
    }

    // For image parts, validate image is a string (data URL validation done separately)
    if (p.type === 'image') {
      if (typeof p.image !== 'string') return false
    }
  }

  return true
}

// Extract text content from UIMessage parts for security checks
function extractTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join(' ')
}

// Note: ChatMessage interface removed - no longer used after AI SDK v6 migration
// Now using UIMessage format directly from 'ai' package

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
    // AI SDK v6: messages are in UIMessage format with parts array
    const {
      messages,
      modelId,
      provider,
      apiKey,
      thinkingLevel,
      webSearchEnabled,
      images, // Images passed from client body (AI SDK v6)
    } = body as {
      messages: UIMessage[]
      modelId: string
      provider: AIProvider
      apiKey: string
      thinkingLevel?: ThinkingLevel
      webSearchEnabled?: boolean
      images?: string[] // Base64 images from client
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

    // Validate message structure for AI SDK v6 UIMessage format
    // Filter out system role to prevent prompt injection
    const validatedMessages: UIMessage[] = []
    for (const msg of messages) {
      if (!isValidUIMessage(msg)) {
        return new Response(
          JSON.stringify({ error: 'Invalid message format: each message must have a valid role (user/assistant) and parts array' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      // Type assertion after validation
      validatedMessages.push(msg as UIMessage)
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
      const textContent = extractTextFromParts(message.parts as Array<{ type: string; text?: string }>)

      if (containsDangerousPatterns(textContent)) {
        return new Response(
          JSON.stringify({ error: 'Message contains disallowed content' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // AI SDK v6: Convert UIMessages to ModelMessages
    const modelMessages = await convertToModelMessages(validatedMessages)

    // Handle images passed in body (for multimodal support)
    // Add images to the last user message if provided
    if (images && images.length > 0 && modelMessages.length > 0) {
      const lastUserMessageIndex = modelMessages.findLastIndex((m) => m.role === 'user')
      if (lastUserMessageIndex !== -1) {
        const lastUserMessage = modelMessages[lastUserMessageIndex]
        // Convert content to array format if it's a string
        const currentContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> =
          typeof lastUserMessage.content === 'string'
            ? [{ type: 'text' as const, text: lastUserMessage.content }]
            : Array.isArray(lastUserMessage.content)
              ? (lastUserMessage.content.filter(
                  (p): p is { type: 'text'; text: string } | { type: 'image'; image: string } =>
                    p.type === 'text' || p.type === 'image'
                ))
              : []

        // Validate and add images
        const validatedImages: Array<{ type: 'image'; image: string }> = []
        let requestImageCount = 0
        let requestTotalImageSize = 0

        for (const image of images) {
          // Validate data URL format
          if (!isValidImageDataUrl(image)) continue

          // Calculate size
          const imageSize = getDataUrlSize(image)

          // Check limits
          if (imageSize > MAX_IMAGE_SIZE_BYTES) continue
          if (requestImageCount >= MAX_IMAGES_PER_REQUEST) continue
          if (requestTotalImageSize + imageSize > MAX_TOTAL_IMAGE_SIZE_BYTES) continue

          // Validate MIME type
          const actualMimeType = getDataUrlMimeType(image)
          if (!actualMimeType || !ALLOWED_IMAGE_TYPES.includes(actualMimeType as typeof ALLOWED_IMAGE_TYPES[number])) continue

          // All checks passed
          requestImageCount++
          requestTotalImageSize += imageSize
          validatedImages.push({ type: 'image' as const, image })
        }

        // Update the message with images
        if (validatedImages.length > 0) {
          // Create a properly typed content array
          const newContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
            ...currentContent,
            ...validatedImages,
          ]
          modelMessages[lastUserMessageIndex] = {
            role: 'user',
            content: newContent,
          }
        }
      }
    }

    // Pass webSearchEnabled to getLanguageModel (handles Google search grounding)
    const model = getLanguageModel(provider, modelId, apiKey, {
      webSearchEnabled: webSearchEnabled === true,
    })

    // Get current date for system prompt
    const now = new Date()
    const currentDate = now.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

    // System prompt for high-quality responses
    // Include web search instructions only when enabled
    const webSearchInstructions = webSearchEnabled ? `
## CRITICAL: Web Search Instructions
You have access to web search tools. **YOU MUST USE THEM** for:
- ANY question about current events, news, or recent information
- ANY question that requires up-to-date data (prices, weather, sports scores, etc.)
- ANY question where your training data might be outdated

**NEVER answer from training data alone** when the question is about:
- "今日" (today), "最新" (latest), "現在" (current), "ニュース" (news)
- Recent events, dates after your training cutoff
- Real-time information (stocks, weather, etc.)

**ALWAYS search first, then synthesize the results.**
` : ''

    const systemPrompt = `You are a helpful, knowledgeable AI assistant.
Current date: ${currentDate}
${webSearchInstructions}
## Response Quality
- Provide comprehensive, well-organized answers
- Structure responses with clear visual hierarchy
- Be thorough yet scannable - users should grasp key points quickly

## News & Information Requests
When asked about news, current events, or information gathering:
- **Start with date**: 「${currentDate}時点の情報」
- **Categorize clearly**: Use distinct categories like:
  - 🏛️ **政治・経済**
  - 🌍 **国際**
  - 💻 **テクノロジー**
  - 🎭 **エンタメ・スポーツ**
  - 📊 **社会・生活**
- **Keep each item brief**: 1-2 sentences per news item
- **Use bullet points**: Each news item as a single bullet
- **NO raw URLs in text**: Mention source names only (例: 「NHKによると」「日経新聞が報じた」)
- **Group sources at end**: List sources in a "参考リンク" section at the bottom

## General Formatting
- Use markdown: **Bold** for headlines, ## for sections
- Keep paragraphs short (2-3 sentences max)
- Use emoji sparingly for visual categorization
- Ensure adequate whitespace between sections

## Language
- Match the user's language (Japanese → Japanese, English → English)
- For Japanese: Use natural, readable Japanese`

    // Get web search tools for all providers (OpenAI, Anthropic, Google)
    // All providers use tool-based search in AI SDK v6
    const webSearchTools = webSearchEnabled === true
      ? getWebSearchTools(provider, apiKey)
      : undefined

    // Check if this is an OpenAI reasoning model (requires special configuration)
    const isReasoningModel = provider === 'openai' && isOpenAIReasoningModel(modelId)

    // Use client-specified thinking level if valid, otherwise default to 'medium'
    const effectiveThinkingLevel: ThinkingLevel = isValidThinkingLevel(thinkingLevel)
      ? thinkingLevel
      : 'medium'

    // Map 'xhigh' to 'high' for OpenAI API (xhigh is internal UI value, API only accepts low/medium/high)
    const apiReasoningEffort = effectiveThinkingLevel === 'xhigh' ? 'high' : effectiveThinkingLevel

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      // Add web search tools for OpenAI and Anthropic when enabled
      ...(webSearchTools && { tools: webSearchTools }),
      // Configure reasoning effort for OpenAI reasoning models
      // Uses client-specified level for customizable thinking depth
      ...(isReasoningModel && {
        providerOptions: {
          openai: {
            reasoningEffort: apiReasoningEffort,
          },
        },
      }),
      // Handle streaming errors (e.g., billing_not_active)
      // These errors occur DURING the stream and won't be caught by try-catch
      onError({ error }) {
        console.error('Streaming error:', error)
      },
    })

    // Use toUIMessageStreamResponse for proper error handling
    // This propagates streaming errors to the client's onError callback
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        // Extract user-friendly message from the error
        // Handle both Error instances and plain objects (OpenAI streaming errors)
        let message = ''

        if (error instanceof Error) {
          message = error.message || ''
        } else if (typeof error === 'object' && error !== null) {
          // Handle OpenAI streaming error format: { type: 'error', error: { type, code, message } }
          const errObj = error as Record<string, unknown>
          if (errObj.error && typeof errObj.error === 'object') {
            const innerError = errObj.error as Record<string, unknown>
            message = String(innerError.message || innerError.type || innerError.code || '')
          } else {
            message = String(errObj.message || errObj.type || errObj.code || '')
          }
        }

        // Map common error types to user-friendly messages
        if (message.includes('billing_not_active') || message.includes('billing')) {
          return 'API billing is not active. Please check your billing settings on OpenAI platform.'
        }
        if (message.includes('rate_limit') || message.includes('Rate limit')) {
          return 'Rate limit exceeded. Please try again later.'
        }
        if (message.includes('invalid_api_key') || message.includes('Invalid API key')) {
          return 'Invalid API key. Please check your API key settings.'
        }
        if (message.includes('model_not_found') || message.includes('does not exist')) {
          return 'Model not found. Please select a different model.'
        }

        return message || 'An error occurred during streaming.'
      },
    })
  } catch (error) {
    // Structured error logging without sensitive information
    console.error('Chat API error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : undefined,
      timestamp: new Date().toISOString(),
    })

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
