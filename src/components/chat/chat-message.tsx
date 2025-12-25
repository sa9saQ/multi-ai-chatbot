'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'
import { CodeBlock } from './code-block'
import { ThinkingTimeDisplay } from './typing-indicator'

interface ChatMessageProps {
  message: Message
  className?: string
}

function MessageImages({ images }: { images: string[] }) {
  const t = useTranslations('chat')

  if (images.length === 0) return null

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <div
          key={index}
          className="relative h-24 w-24 overflow-hidden rounded-lg border bg-muted sm:h-32 sm:w-32"
        >
          <img
            src={image}
            alt={t('attachedImage', { number: index + 1 })}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  )
}

function parseMessageContent(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g

  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.slice(lastIndex, match.index)}
        </span>
      )
    }

    const language = match[1] || 'text'
    const code = match[2].trim()

    parts.push(<CodeBlock key={`code-${match.index}`} language={language} code={code} />)

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>
    )
  }

  return parts
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const locale = useLocale()
  const isUser = message.role === 'user'

  // Don't render assistant messages with empty content (reasoning models start with empty content)
  // This prevents showing just the timestamp before actual content arrives
  const hasContent = message.content.trim().length > 0 || (message.images && message.images.length > 0)
  if (!isUser && !hasContent) {
    return null
  }

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'flex max-w-[90%] flex-col gap-1 rounded-lg px-3 py-2 sm:max-w-[85%] sm:px-4 md:max-w-[75%] lg:max-w-[65%]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {/* Show thinking time badge for reasoning model responses */}
        {!isUser && message.thinkingTime !== undefined && (
          <ThinkingTimeDisplay
            seconds={message.thinkingTime}
            thinkingLevel={message.thinkingLevel}
            className="mb-1 self-start"
          />
        )}
        {/* Show attached images before text content */}
        {message.images && message.images.length > 0 && (
          <MessageImages images={message.images} />
        )}
        <div className="text-sm">{parseMessageContent(message.content)}</div>
        <time
          className={cn(
            'text-xs',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
          dateTime={new Date(message.createdAt).toISOString()}
        >
          {new Date(message.createdAt).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
    </div>
  )
}
