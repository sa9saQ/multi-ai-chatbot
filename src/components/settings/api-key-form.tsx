'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ApiKeyInput } from './api-key-input'
import { useSettingsStore } from '@/hooks/use-settings-store'
import { AI_PROVIDERS } from '@/types/ai'
import type { AIProvider } from '@/types/ai'
import type { ProviderApiKeys } from '@/types/settings'

const PROVIDERS: AIProvider[] = ['openai', 'anthropic', 'google']

// Basic API key format validation
const API_KEY_PATTERNS: Record<AIProvider, RegExp | null> = {
  openai: /^sk-[a-zA-Z0-9-_]{20,}$/,
  anthropic: /^sk-ant-[a-zA-Z0-9-_]{20,}$/,
  google: null, // Google API keys have varied formats
}

function validateApiKey(provider: AIProvider, apiKey: string): boolean {
  const pattern = API_KEY_PATTERNS[provider]
  if (!pattern) return true // Skip validation for providers without known patterns
  return pattern.test(apiKey)
}

export function ApiKeyForm() {
  const t = useTranslations('settings')
  const { setApiKey, removeApiKey, hasApiKey } = useSettingsStore()

  const handleSave = React.useCallback(
    async (provider: keyof ProviderApiKeys, apiKey: string) => {
      // Trim and validate non-empty
      const trimmedKey = apiKey.trim()
      if (!trimmedKey) {
        throw new Error(t('invalidApiKeyFormat'))
      }
      if (!validateApiKey(provider, trimmedKey)) {
        throw new Error(t('invalidApiKeyFormat'))
      }
      await setApiKey(provider, trimmedKey)
    },
    [setApiKey, t]
  )

  const handleRemove = React.useCallback(
    (provider: keyof ProviderApiKeys) => {
      removeApiKey(provider)
    },
    [removeApiKey]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('apiKeys')}</CardTitle>
        <CardDescription>
          {t('apiKeyDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map((provider) => (
          <div key={provider} className="space-y-2">
            <Label htmlFor={`api-key-${provider}`} className="flex items-center gap-2">
              <span>{AI_PROVIDERS[provider].icon}</span>
              <span>{AI_PROVIDERS[provider].name}</span>
            </Label>
            <ApiKeyInput
              provider={provider}
              hasExistingKey={hasApiKey(provider)}
              onSave={(key) => handleSave(provider, key)}
              onRemove={() => handleRemove(provider)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
