'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { ChatMessage } from './chat-message'
import { TypingIndicator } from './typing-indicator'
import type { Message } from '@/types/chat'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
  className?: string
}

export function MessageList({ messages, isLoading, className }: MessageListProps) {
  const t = useTranslations('chat')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn('flex flex-1 items-center justify-center', className)}>
        <p className="text-muted-foreground">{t('noMessages')}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex-1 overflow-y-auto', className)}
    >
      <div className="flex flex-col p-4" role="log" aria-live="polite" aria-label={t('messageHistory')}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="py-2" aria-busy="true">
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
