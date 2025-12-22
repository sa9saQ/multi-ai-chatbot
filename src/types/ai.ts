export type AIProvider = 'openai' | 'anthropic' | 'google'

export type ModelTier = 'default' | 'premium' | 'reasoning'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  tier: ModelTier
  description: string
  strengths: string[] // Model specialties/strengths
  contextWindow: number // Max tokens
  pricing: {
    input: number // $ per 1M tokens
    output: number // $ per 1M tokens
  }
  supportsVision?: boolean // Can process images
}

export const AI_PROVIDERS: Record<AIProvider, { name: string; icon: string }> = {
  openai: { name: 'OpenAI', icon: '🤖' },
  anthropic: { name: 'Anthropic', icon: '🧠' },
  google: { name: 'Google', icon: '✨' },
}

export const AI_MODELS: AIModel[] = [
  // ============================================
  // OpenAI Models (Release order: old → new)
  // ============================================

  // o3 - Dec 2024
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    tier: 'reasoning',
    description: 'Best for complex problem solving',
    strengths: ['Problem solving', 'Analysis', 'Research'],
    contextWindow: 200000,
    pricing: { input: 10.0, output: 40.0 },
    supportsVision: true,
  },

  // o4-mini - Apr 2025
  {
    id: 'o4-mini',
    name: 'o4-mini',
    provider: 'openai',
    tier: 'reasoning',
    description: 'Great for math and logical problems',
    strengths: ['Math', 'Logic', 'Step-by-step'],
    contextWindow: 200000,
    pricing: { input: 1.1, output: 4.4 },
    supportsVision: true,
  },

  // GPT-5 Mini - Aug 2025
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    tier: 'default',
    description: 'Fast responses at low cost',
    strengths: ['Fast', 'Affordable', 'Daily use'],
    contextWindow: 200000,
    pricing: { input: 0.4, output: 1.6 },
    supportsVision: true,
  },

  // GPT-5.2 - Dec 11, 2025
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    tier: 'premium',
    description: 'Smart and balanced, latest model',
    strengths: ['Smart', 'Balanced', 'Latest'],
    contextWindow: 400000,
    pricing: { input: 1.75, output: 14.0 },
    supportsVision: true,
  },

  // GPT-5.2 Pro - Dec 11, 2025
  {
    id: 'gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    provider: 'openai',
    tier: 'premium',
    description: 'Highest accuracy for difficult questions',
    strengths: ['Most accurate', 'Deep thinking', 'Best quality'],
    contextWindow: 400000,
    pricing: { input: 15.0, output: 60.0 },
    supportsVision: true,
  },

  // ============================================
  // Anthropic Claude Models (Release order: old → new)
  // ============================================

  // Claude 3.5 Haiku - Oct 2024
  {
    id: 'claude-3-5-haiku-latest',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    tier: 'default',
    description: 'Fast and friendly responses',
    strengths: ['Fast', 'Friendly', 'Affordable'],
    contextWindow: 200000,
    pricing: { input: 0.8, output: 4.0 },
    supportsVision: true,
  },

  // Claude Sonnet 4.5 - Sep 29, 2025
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'premium',
    description: 'Great balance of speed and smarts',
    strengths: ['Balanced', 'Thoughtful', 'Reliable'],
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    supportsVision: true,
  },

  // Claude Opus 4.5 - Nov 1, 2025
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'premium',
    description: 'Most intelligent, fewer mistakes',
    strengths: ['Smartest', 'Careful', 'Detailed'],
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0 },
    supportsVision: true,
  },

  // ============================================
  // Google Gemini Models (Release order: old → new)
  // ============================================

  // Gemini 2.5 Flash - Mar 2025
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    tier: 'default',
    description: 'Fast and very affordable',
    strengths: ['Fast', 'Cheap', 'Images OK'],
    contextWindow: 1000000,
    pricing: { input: 0.075, output: 0.3 },
    supportsVision: true,
  },

  // Gemini 2.5 Pro - Jun 2025
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'premium',
    description: 'Powerful and stable',
    strengths: ['Powerful', 'Stable', 'Reliable'],
    contextWindow: 1000000,
    pricing: { input: 1.25, output: 5.0 },
    supportsVision: true,
  },

  // Gemini 3 Flash - Dec 17, 2025
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'google',
    tier: 'premium',
    description: 'Newest and fastest',
    strengths: ['Newest', 'Fast', 'Smart'],
    contextWindow: 1000000,
    pricing: { input: 0.5, output: 3.0 },
    supportsVision: true,
  },

  // Gemini 3 Pro - Dec 17, 2025
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'google',
    tier: 'reasoning',
    description: 'Most capable reasoning model',
    strengths: ['Reasoning', 'Complex tasks', 'Analysis'],
    contextWindow: 1000000,
    pricing: { input: 2.5, output: 10.0 },
    supportsVision: true,
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

export function getModelsByTier(tier: ModelTier): AIModel[] {
  return AI_MODELS.filter((model) => model.tier === tier)
}

// Get models sorted by a specific strength
export function getModelsByStrength(strength: string): AIModel[] {
  return AI_MODELS.filter((model) =>
    model.strengths.some((s) => s.toLowerCase().includes(strength.toLowerCase()))
  )
}

// Get models that support vision/image input
export function getVisionModels(): AIModel[] {
  return AI_MODELS.filter((model) => model.supportsVision)
}
