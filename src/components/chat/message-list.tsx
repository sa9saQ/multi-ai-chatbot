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

  // Track if user has manually scrolled away from bottom
  const isNearBottomRef = React.useRef(true)
  const lastMessageCountRef = React.useRef(messages.length)

  // Detect user scroll position to avoid auto-scrolling while reading history
  const handleScroll = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    // Consider "near bottom" if within 100px of the bottom
    const threshold = 100
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    isNearBottomRef.current = distanceFromBottom < threshold
  }, [])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  React.useEffect(() => {
    // Don't interrupt user reading history
    if (!isNearBottomRef.current) return

    const messageCountChanged = messages.length !== lastMessageCountRef.current
    lastMessageCountRef.current = messages.length

    // Use instant scroll during streaming to prevent jank from overlapping animations
    // Use smooth scroll only for discrete new messages when not streaming
    // Note: 'instant' is widely supported but not in TypeScript's ScrollBehavior type
    // Using type assertion since 'auto' respects CSS scroll-behavior which could cause issues
    const behavior = isLoading || !messageCountChanged ? 'instant' : 'smooth'

    bottomRef.current?.scrollIntoView({ behavior: behavior as ScrollBehavior })
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
