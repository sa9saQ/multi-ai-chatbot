export type AIProvider = 'openai' | 'anthropic' | 'google'

export type ModelTier = 'default' | 'premium'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  tier: ModelTier
  description: string
}

export const AI_PROVIDERS: Record<AIProvider, { name: string; icon: string }> = {
  openai: { name: 'OpenAI', icon: '🤖' },
  anthropic: { name: 'Anthropic', icon: '🧠' },
  google: { name: 'Google', icon: '✨' },
}

export const AI_MODELS: AIModel[] = [
  // OpenAI
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'default',
    description: 'Fast and cost-effective',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'premium',
    description: 'Most capable OpenAI model',
  },
  // Anthropic
  {
    id: 'claude-3-5-sonnet-latest',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    tier: 'default',
    description: 'Balanced performance',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    tier: 'premium',
    description: 'Best for coding',
  },
  // Google
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'default',
    description: 'Fast multimodal model',
  },
  {
    id: 'gemini-2.5-pro-preview-06-05',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'premium',
    description: 'Most capable Google model',
  },
]

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((model) => model.id === id)
}

export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return AI_MODELS.filter((model) => model.provider === provider)
}

export function getDefaultModel(provider: AIProvider): AIModel | undefined {
  return AI_MODELS.find((model) => model.provider === provider && model.tier === 'default')
}
