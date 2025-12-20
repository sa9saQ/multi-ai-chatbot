'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronsUpDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AI_MODELS, AI_PROVIDERS, getModelsByProvider } from '@/types/ai'
import type { AIModel, AIProvider } from '@/types/ai'
import { useChatStore } from '@/hooks/use-chat-store'
import { useSettingsStore } from '@/hooks/use-settings-store'

export function ModelSelector() {
  const t = useTranslations('model')
  const { selectedModelId, selectedProvider, setSelectedModel } = useChatStore()
  const { hasApiKey } = useSettingsStore()

  const selectedModel = AI_MODELS.find((m) => m.id === selectedModelId)

  const handleSelect = (model: AIModel) => {
    setSelectedModel(model.id, model.provider)
  }

  const providers: AIProvider[] = ['openai', 'anthropic', 'google']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2 truncate">
            <span>{AI_PROVIDERS[selectedProvider]?.icon}</span>
            <span className="truncate">{selectedModel?.name ?? t('select')}</span>
            {selectedModel?.tier === 'premium' && (
              <Sparkles className="h-3 w-3 text-yellow-500" />
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-[90vw] md:w-64">
        {providers.map((provider, index) => {
          const models = getModelsByProvider(provider)
          const isConfigured = hasApiKey(provider)

          return (
            <React.Fragment key={provider}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center gap-2">
                <span>{AI_PROVIDERS[provider]?.icon}</span>
                <span>{AI_PROVIDERS[provider]?.name}</span>
                {!isConfigured && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {t('notConfigured')}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {models.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    disabled={!isConfigured}
                    onClick={() => handleSelect(model)}
                    aria-current={model.id === selectedModelId ? 'true' : undefined}
                    className={cn(
                      'flex cursor-pointer items-center justify-between',
                      !isConfigured && 'opacity-50'
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1">
                        {model.name}
                        {model.tier === 'premium' && (
                          <Sparkles className="h-3 w-3 text-yellow-500" />
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                    {model.id === selectedModelId && (
                      <Check className="h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
