'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/hooks/use-chat-store'
import { getModelById, hasConfigurableThinking, type ThinkingLevel } from '@/types/ai'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  const t = useTranslations('chat')
  const tModel = useTranslations('model')
  const { selectedModelId, thinkingLevel, isGenerating } = useChatStore()
  const [seconds, setSeconds] = React.useState(0)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const currentModel = getModelById(selectedModelId)
  const isThinkingModel = currentModel?.supportsThinking ?? false
  // Only show thinking level for models with configurable levels (not native thinking like Gemini)
  const showThinkingLevel = hasConfigurableThinking(selectedModelId)

  // Seconds counter for thinking models
  // Reset counter when isGenerating changes to handle consecutive generations
  React.useEffect(() => {
    if (isThinkingModel && isGenerating) {
      setSeconds(0)
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isThinkingModel, isGenerating])

  const getThinkingLevelText = () => {
    switch (thinkingLevel) {
      case 'low':
        return tModel('thinkingLow')
      case 'medium':
        return tModel('thinkingMedium')
      case 'high':
        return tModel('thinkingHigh')
    }
  }

  if (isThinkingModel) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg bg-purple-50 px-4 py-2.5 dark:bg-purple-950/30',
          className
        )}
      >
        <Brain className="h-5 w-5 animate-pulse text-purple-500" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            {t('thinkingFor', { seconds })}
          </span>
          {showThinkingLevel && (
            <span className="text-xs text-purple-500 dark:text-purple-400">
              {getThinkingLevelText()} {tModel('thinkingModeLabel')}
            </span>
          )}
        </div>
        <div className="ml-auto flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
      </div>
      <span className="text-sm">{t('thinking')}</span>
    </div>
  )
}

// Collapsed thinking time display (shown after completion)
interface ThinkingTimeDisplayProps {
  seconds: number
  thinkingLevel?: ThinkingLevel
  className?: string
}

export function ThinkingTimeDisplay({
  seconds,
  thinkingLevel,
  className,
}: ThinkingTimeDisplayProps) {
  const t = useTranslations('chat')
  const tModel = useTranslations('model')
  const [isExpanded, setIsExpanded] = React.useState(false)

  const getLevelLabel = () => {
    if (!thinkingLevel) return null
    switch (thinkingLevel) {
      case 'low':
        return tModel('thinkingLow')
      case 'medium':
        return tModel('thinkingMedium')
      case 'high':
        return tModel('thinkingHigh')
    }
  }

  return (
    <button
      type="button"
      onClick={() => setIsExpanded(!isExpanded)}
      aria-expanded={isExpanded}
      className={cn(
        'flex items-center gap-2 rounded-md bg-purple-50 px-3 py-1.5 text-sm transition-colors hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50',
        className
      )}
    >
      <Brain className="h-4 w-4 text-purple-500" />
      <span className="text-purple-700 dark:text-purple-300">
        {t('thoughtFor', { seconds })}
      </span>
      {isExpanded ? (
        <ChevronUp className="h-3.5 w-3.5 text-purple-500" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-purple-500" />
      )}
      {isExpanded && thinkingLevel && (
        <span className="ml-2 text-xs text-purple-500">
          {getLevelLabel()} {tModel('thinkingModeLabel')}
        </span>
      )}
    </button>
  )
}
