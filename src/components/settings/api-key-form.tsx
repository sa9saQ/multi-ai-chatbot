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

export function ApiKeyForm() {
  const t = useTranslations('settings')
  const { setApiKey, removeApiKey, hasApiKey } = useSettingsStore()

  const handleSave = React.useCallback(
    async (provider: keyof ProviderApiKeys, apiKey: string) => {
      await setApiKey(provider, apiKey)
    },
    [setApiKey]
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
          {t('apiKeyPlaceholder')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map((provider) => (
          <div key={provider} className="space-y-2">
            <Label htmlFor={`${provider}-api-key`} className="flex items-center gap-2">
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
