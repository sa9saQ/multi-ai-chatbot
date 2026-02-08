import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { AI_MODELS, type AIProvider } from '@/types/ai'

export function createAIProvider(provider: AIProvider, apiKey: string) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(`API key is required for provider: ${provider}`)
  }

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

// OpenAI reasoning models derived from AI_MODELS
// These models use extended thinking and require .responses() method
const OPENAI_REASONING_MODEL_IDS = AI_MODELS
  .filter(
    (m) =>
      m.provider === 'openai' &&
      m.supportsThinking === true &&
      (m.thinkingLevels?.length ?? 0) > 0
  )
  .map((m) => m.id)

export function isOpenAIReasoningModel(modelId: string): boolean {
  return OPENAI_REASONING_MODEL_IDS.some(
    (rm) => modelId === rm || modelId.startsWith(`${rm}-`)
  )
}

export interface LanguageModelOptions {
  webSearchEnabled?: boolean
}

export function getLanguageModel(
  provider: AIProvider,
  modelId: string,
  apiKey: string,
  _options: LanguageModelOptions = {}
) {
  // Note: webSearchEnabled is now handled via tools in getWebSearchTools()
  // Google search grounding is also done via google.tools.googleSearch()

  // AI SDK v6: Use standard provider call for all models including reasoning models
  // The .responses() method was causing streaming issues (responses buffered until complete)
  // streamText handles reasoning models correctly with the standard provider
  const aiProvider = createAIProvider(provider, apiKey)
  return aiProvider(modelId)
}

// Get web search tools for providers that use tools-based search
// All providers now use tool-based approach in AI SDK v6
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getWebSearchTools(provider: AIProvider, apiKey: string): any {
  if (provider === 'openai') {
    const openaiProvider = createOpenAI({ apiKey })
    return {
      web_search: openaiProvider.tools.webSearchPreview({
        searchContextSize: 'medium',
      }),
    }
  }

  if (provider === 'anthropic') {
    // Anthropic uses provider-defined tool for web search
    const anthropicProvider = createAnthropic({ apiKey })
    return {
      web_search: anthropicProvider.tools.webSearch_20250305({
        maxUses: 5,
      }),
    }
  }

  if (provider === 'google') {
    // Google uses googleSearch tool for search grounding (replaces useSearchGrounding)
    const googleProvider = createGoogleGenerativeAI({ apiKey })
    return {
      google_search: googleProvider.tools.googleSearch({}),
    }
  }

  return undefined
}
