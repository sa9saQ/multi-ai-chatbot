'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  const t = useTranslations('chat')

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
