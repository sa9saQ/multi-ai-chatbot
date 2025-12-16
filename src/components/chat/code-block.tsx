'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  language: string
  code: string
  className?: string
}

export function CodeBlock({ language, code, className }: CodeBlockProps) {
  const t = useTranslations('common')
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className={cn('my-2 overflow-hidden rounded-lg border bg-muted/50', className)}>
      <div className="flex items-center justify-between border-b bg-muted/80 px-3 py-1">
        <span className="text-xs font-medium text-muted-foreground">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              {t('copied')}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  )
}
