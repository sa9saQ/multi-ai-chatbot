import { streamText, APICallError } from 'ai'
import { getLanguageModel } from '@/lib/ai/providers'
import { sanitizeInput, validateApiKey } from '@/lib/ai/sanitize'
import type { AIProvider } from '@/types/ai'

export const runtime = 'edge'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(req: Request) {
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

    if (!modelId || !provider) {
      return new Response(JSON.stringify({ error: 'Model ID and provider are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const sanitizedMessages = messages.map((message) => ({
      role: message.role,
      content: sanitizeInput(message.content),
    }))

    const model = getLanguageModel(provider, modelId, apiKey)

    const result = streamText({
      model,
      messages: sanitizedMessages,
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
