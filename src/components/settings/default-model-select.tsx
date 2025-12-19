'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/hooks/use-settings-store'
import { AI_PROVIDERS, AI_MODELS, getModelsByProvider } from '@/types/ai'
import type { AIProvider } from '@/types/ai'

const PROVIDERS: AIProvider[] = ['openai', 'anthropic', 'google']

export function DefaultModelSelect() {
  const t = useTranslations('settings')
  const tModel = useTranslations('model')
  const { settings, setDefaultModel, hasApiKey } = useSettingsStore()
  const { defaultProvider, defaultModelId } = settings

  const handleProviderChange = (provider: AIProvider) => {
    // When provider changes, select the first available model for that provider
    const models = getModelsByProvider(provider)
    const defaultModel = models.find((m) => m.tier === 'default') ?? models[0]
    if (defaultModel) {
      setDefaultModel(provider, defaultModel.id)
    }
  }

  const handleModelChange = (modelId: string) => {
    setDefaultModel(defaultProvider, modelId)
  }

  const availableModels = getModelsByProvider(defaultProvider)
  const isProviderConfigured = hasApiKey(defaultProvider)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('defaultModel')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="default-provider">{t('provider')}</Label>
          <Select value={defaultProvider} onValueChange={handleProviderChange}>
            <SelectTrigger id="default-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  <span className="flex items-center gap-2">
                    <span>{AI_PROVIDERS[provider].icon}</span>
                    <span>{AI_PROVIDERS[provider].name}</span>
                    {!hasApiKey(provider) && (
                      <span className="text-xs text-muted-foreground">
                        ({tModel('notConfigured')})
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-model">{t('model')}</Label>
          <Select
            value={defaultModelId}
            onValueChange={handleModelChange}
            disabled={!isProviderConfigured}
          >
            <SelectTrigger id="default-model" className="w-full">
              <SelectValue placeholder={tModel('select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{tModel('default')}</SelectLabel>
                {availableModels
                  .filter((m) => m.tier === 'default')
                  .map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex items-center gap-2">
                        <span>{model.name}</span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>{tModel('premium')}</SelectLabel>
                {availableModels
                  .filter((m) => m.tier === 'premium')
                  .map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                      </span>
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {!isProviderConfigured && (
            <p className="text-sm text-muted-foreground">
              {tModel('notConfigured')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
