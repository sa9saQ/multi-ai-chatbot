import type { AIProvider } from './ai'

export type Locale = 'ja' | 'en'
export type Theme = 'light' | 'dark' | 'system'

export interface ProviderApiKeys {
  openai?: string
  anthropic?: string
  google?: string
}

export interface Settings {
  locale: Locale
  theme: Theme
  defaultProvider: AIProvider
  defaultModelId: string
  apiKeys: ProviderApiKeys
}

export const DEFAULT_SETTINGS: Settings = {
  locale: 'ja',
  theme: 'system',
  defaultProvider: 'openai',
  defaultModelId: 'gpt-5-mini',
  apiKeys: {},
}

export function isProviderConfigured(
  apiKeys: ProviderApiKeys,
  provider: AIProvider
): boolean {
  const key = apiKeys[provider]
  return typeof key === 'string' && key.length > 0
}

export function getConfiguredProviders(apiKeys: ProviderApiKeys): AIProvider[] {
  const providers: AIProvider[] = ['openai', 'anthropic', 'google']
  return providers.filter((provider) => isProviderConfigured(apiKeys, provider))
}
