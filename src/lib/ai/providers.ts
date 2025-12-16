import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { AIProvider } from '@/types/ai'

export function createAIProvider(provider: AIProvider, apiKey: string) {
  switch (provider) {
    case 'openai':
      return createOpenAI({
        apiKey,
      })
    case 'anthropic':
      return createAnthropic({
        apiKey,
      })
    case 'google':
      return createGoogleGenerativeAI({
        apiKey,
      })
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export function getLanguageModel(provider: AIProvider, modelId: string, apiKey: string) {
  const aiProvider = createAIProvider(provider, apiKey)
  return aiProvider(modelId)
}
