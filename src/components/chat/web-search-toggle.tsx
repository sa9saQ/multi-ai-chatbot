'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Globe, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/hooks/use-chat-store'
import { supportsWebSearch } from '@/types/ai'

export function WebSearchToggle() {
  const t = useTranslations('chat')
  const { selectedModelId, webSearchEnabled, setWebSearchEnabled, isGenerating } = useChatStore()

  const modelSupportsWebSearch = supportsWebSearch(selectedModelId)

  if (!modelSupportsWebSearch) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={webSearchEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            disabled={isGenerating}
            className={cn(
              'gap-2 font-medium transition-all',
              webSearchEnabled && 'bg-emerald-600 hover:bg-emerald-700 text-white',
              !webSearchEnabled && 'border-dashed'
            )}
          >
            {webSearchEnabled ? (
              <Globe className="h-4 w-4 animate-pulse" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {webSearchEnabled ? t('webSearchOn') : t('webSearch')}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {webSearchEnabled ? t('webSearchOn') : t('webSearch')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('webSearchDesc')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
