'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'
import { CodeBlock } from './code-block'

interface ChatMessageProps {
  message: Message
  className?: string
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
          'flex max-w-[80%] flex-col gap-1 rounded-lg px-4 py-2',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
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
