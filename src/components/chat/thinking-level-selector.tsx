'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Brain, Zap, Flame, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/hooks/use-chat-store'
import { getModelById, hasConfigurableThinking } from '@/types/ai'
import type { ThinkingLevel } from '@/types/ai'

const THINKING_LEVELS: ThinkingLevel[] = ['medium', 'high', 'xhigh']

function ThinkingLevelIcon({ level, className }: { level: ThinkingLevel; className?: string }) {
  switch (level) {
    case 'medium':
      return <Zap className={cn('h-4 w-4', className)} />
    case 'high':
      return <Brain className={cn('h-4 w-4', className)} />
    case 'xhigh':
      return <Flame className={cn('h-4 w-4', className)} />
    default:
      // Fallback to medium icon for any persisted invalid values (e.g., 'low')
      return <Zap className={cn('h-4 w-4', className)} />
  }
}

function getLevelColor(level: ThinkingLevel): string {
  switch (level) {
    case 'medium':
      return 'text-green-600 dark:text-green-400'
    case 'high':
      return 'text-blue-600 dark:text-blue-400'
    case 'xhigh':
      return 'text-purple-600 dark:text-purple-400'
    default:
      // Fallback to medium color for any persisted invalid values
      return 'text-green-600 dark:text-green-400'
  }
}

function getLevelBgColor(level: ThinkingLevel): string {
  switch (level) {
    case 'medium':
      return 'bg-green-600 hover:bg-green-700'
    case 'high':
      return 'bg-blue-600 hover:bg-blue-700'
    case 'xhigh':
      return 'bg-purple-600 hover:bg-purple-700'
    default:
      // Fallback to medium background for any persisted invalid values
      return 'bg-green-600 hover:bg-green-700'
  }
}

export function ThinkingLevelSelector() {
  const t = useTranslations('model')
  const { selectedModelId, thinkingLevel, setThinkingLevel, generatingConversationId, currentConversationId } = useChatStore()

  const currentModel = getModelById(selectedModelId)
  const showThinkingSelector = currentModel?.supportsThinking && hasConfigurableThinking(selectedModelId)

  if (!showThinkingSelector) {
    return null
  }

  const getLevelLabel = (level: ThinkingLevel): string => {
    switch (level) {
      case 'medium':
        return t('thinkingMedium')
      case 'high':
        return t('thinkingHigh')
      case 'xhigh':
        return t('thinkingXhigh')
      default:
        // Fallback to medium label for any persisted invalid values
        return t('thinkingMedium')
    }
  }

  const getLevelDesc = (level: ThinkingLevel): string => {
    switch (level) {
      case 'medium':
        return t('thinkingMediumDesc')
      case 'high':
        return t('thinkingHighDesc')
      case 'xhigh':
        return t('thinkingXhighDesc')
      default:
        // Fallback to medium description for any persisted invalid values
        return t('thinkingMediumDesc')
    }
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={generatingConversationId !== null && generatingConversationId === currentConversationId}
                className={cn(
                  'gap-2 border-2 font-medium',
                  thinkingLevel === 'medium' && 'border-green-500/50 bg-green-50 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-950/30 dark:hover:bg-green-950/50',
                  thinkingLevel === 'high' && 'border-blue-500/50 bg-blue-50 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-950/30 dark:hover:bg-blue-950/50',
                  thinkingLevel === 'xhigh' && 'border-purple-500/50 bg-purple-50 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-950/30 dark:hover:bg-purple-950/50'
                )}
              >
                <Sparkles className={cn('h-4 w-4', getLevelColor(thinkingLevel))} />
                <span className={cn('hidden sm:inline', getLevelColor(thinkingLevel))}>
                  {t('thinkingLevel')}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold text-white',
                    getLevelBgColor(thinkingLevel)
                  )}
                >
                  {getLevelLabel(thinkingLevel)}
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{t('thinkingLevel')}</p>
            <p className="text-xs text-muted-foreground">{getLevelDesc(thinkingLevel)}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-56">
          {THINKING_LEVELS.map((level) => (
            <DropdownMenuItem
              key={level}
              onClick={() => setThinkingLevel(level)}
              className={cn(
                'flex cursor-pointer items-center gap-3 py-3',
                thinkingLevel === level && 'bg-accent'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  level === 'medium' && 'bg-green-100 dark:bg-green-900/50',
                  level === 'high' && 'bg-blue-100 dark:bg-blue-900/50',
                  level === 'xhigh' && 'bg-purple-100 dark:bg-purple-900/50'
                )}
              >
                <ThinkingLevelIcon level={level} className={getLevelColor(level)} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{getLevelLabel(level)}</span>
                <span className="text-xs text-muted-foreground">{getLevelDesc(level)}</span>
              </div>
              {thinkingLevel === level && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
