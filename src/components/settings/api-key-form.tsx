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
import { isValidApiKeyFormat } from '@/lib/api-key-validation'

const PROVIDERS: AIProvider[] = ['openai', 'anthropic', 'google']

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
      if (!isValidApiKeyFormat(provider, trimmedKey)) {
        throw new Error(t('invalidApiKeyFormat'))
      }

      // Validate with provider API (with timeout)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000) // Slightly longer than server timeout

      try {
        const response = await fetch('/api/validate-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, apiKey: trimmedKey }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        // Handle server errors (500+) before attempting to parse JSON
        if (!response.ok && response.status >= 500) {
          throw new Error(t('networkError'))
        }

        // Runtime response validation
        const result = await response.json()
        if (typeof result !== 'object' || result === null || typeof result.valid !== 'boolean') {
          throw new Error(t('invalid'))
        }

        if (!result.valid) {
          // Map specific server error codes to user-friendly messages
          const errorCode = typeof result.error === 'string' ? result.error : undefined
          switch (errorCode) {
            case 'timeout':
              throw new Error(t('validationTimeout'))
            case 'network_error':
              throw new Error(t('networkError'))
            case 'invalid_format':
              throw new Error(t('invalidApiKeyFormat'))
            case 'rate_limit_exceeded':
              throw new Error(t('rateLimitExceeded'))
            case 'access_forbidden':
              throw new Error(t('accessForbidden'))
            case 'invalid_key':
              throw new Error(t('invalidKey'))
            default:
              throw new Error(t('invalid'))
          }
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(t('validationTimeout'))
        }
        if (error instanceof Error) {
          throw error
        }
        throw new Error(t('networkError'))
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
