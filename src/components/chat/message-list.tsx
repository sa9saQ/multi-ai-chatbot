'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn('flex flex-1 items-center justify-center', className)}>
        <p className="text-muted-foreground">{t('noMessages')}</p>
      </div>
    )
  }

  return (
    <ScrollArea
      ref={scrollRef}
      className={cn('flex-1', className)}
    >
      <div className="flex flex-col" role="log" aria-live="polite" aria-label={t('messageHistory')}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="p-4" aria-busy="true">
            <TypingIndicator />
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
