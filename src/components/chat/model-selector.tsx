'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronsUpDown, Sparkles, Brain, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AI_MODELS, AI_PROVIDERS, getModelsByProvider } from '@/types/ai'
import type { AIModel, AIProvider, ModelTier } from '@/types/ai'
import { useChatStore } from '@/hooks/use-chat-store'
import { useSettingsStore } from '@/hooks/use-settings-store'

function TierIcon({ tier }: { tier: ModelTier }) {
  switch (tier) {
    case 'premium':
      return <Sparkles className="h-3 w-3 text-yellow-500" aria-label="Premium" />
    case 'reasoning':
      return <Brain className="h-3 w-3 text-purple-500" aria-label="Reasoning" />
    default:
      return <Zap className="h-3 w-3 text-green-500" aria-label="Fast" />
  }
}

export function ModelSelector() {
  const t = useTranslations('model')
  const { selectedModelId, selectedProvider, setSelectedModel } = useChatStore()
  const { hasApiKey } = useSettingsStore()

  const selectedModel = AI_MODELS.find((m) => m.id === selectedModelId)

  const handleSelect = (model: AIModel) => {
    setSelectedModel(model.id, model.provider)
  }

  // Get translated description and strengths for a model
  const getModelTranslation = (modelId: string) => {
    // Convert model ID to translation key (next-intl keys cannot contain '.')
    const translationKey = modelId.replace(/\./g, '_')
    const descriptionKey = `models.${translationKey}.description`
    const strengthsKey = `models.${translationKey}.strengths`

    const description = t(descriptionKey)
    // t() returns the key path when translation is missing (doesn't throw)
    // Check if returned value equals key path to detect missing translation
    if (description === descriptionKey) {
      // Fallback to model's default values if translation not found
      const model = AI_MODELS.find((m) => m.id === modelId)
      return {
        description: model?.description ?? '',
        strengths: model?.strengths ?? [],
      }
    }

    const strengths = t.raw(strengthsKey) as string[]
    return { description, strengths }
  }

  const providers: AIProvider[] = ['openai', 'anthropic', 'google']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2 truncate">
            <span>{AI_PROVIDERS[selectedProvider]?.icon}</span>
            <span className="truncate">{selectedModel?.name ?? t('select')}</span>
            {selectedModel && <TierIcon tier={selectedModel.tier} />}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[90vw] max-w-[800px] p-3">
        {providers.map((provider, index) => {
          const models = getModelsByProvider(provider)
          const isConfigured = hasApiKey(provider)

          return (
            <React.Fragment key={provider}>
              {index > 0 && <DropdownMenuSeparator className="my-2" />}
              <DropdownMenuLabel className="flex items-center gap-2 mb-2">
                <span>{AI_PROVIDERS[provider]?.icon}</span>
                <span>{AI_PROVIDERS[provider]?.name}</span>
                {!isConfigured && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {t('notConfigured')}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {models.map((model) => {
                  const { description, strengths } = getModelTranslation(model.id)
                  const isSelected = model.id === selectedModelId
                  return (
                    <button
                      key={model.id}
                      type="button"
                      disabled={!isConfigured}
                      onClick={() => handleSelect(model)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={cn(
                        'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected && 'border-primary bg-primary/5',
                        !isConfigured && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-sm">
                          {model.name}
                          <TierIcon tier={model.tier} />
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {description}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {strengths.slice(0, 3).map((strength) => (
                          <Badge
                            key={strength}
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
