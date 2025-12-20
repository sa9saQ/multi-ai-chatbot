'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  className?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  className,
}: ChatInputProps) {
  const t = useTranslations('chat')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onSubmit()
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!disabled && value.trim()) {
      onSubmit()
    }
  }

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholder')}
        disabled={disabled}
        className="min-h-[44px] max-h-[200px] resize-none"
        rows={1}
        aria-label={t('placeholder')}
      />
      <Button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label={t('send')}
        className="h-11 w-11 shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
