'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Download, FileText, FileCode, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// Dynamic import for code splitting - export functions only loaded when needed
import type { Conversation } from '@/types/chat'

interface ExportMenuProps {
  conversation: Conversation
  disabled?: boolean
}

export function ExportMenu({ conversation, disabled }: ExportMenuProps) {
  const t = useTranslations('export')
  const rawLocale = useLocale()
  const locale: 'ja' | 'en' = rawLocale === 'ja' || rawLocale === 'en' ? rawLocale : 'en'

  const handleExportText = async () => {
    const { exportConversationAsText } = await import('@/lib/export')
    exportConversationAsText(conversation, locale)
  }

  const handleExportMarkdown = async () => {
    const { exportConversationAsMarkdown } = await import('@/lib/export')
    exportConversationAsMarkdown(conversation, locale)
  }

  const handleExportPdf = async () => {
    const { exportConversationAsPdf } = await import('@/lib/export')
    exportConversationAsPdf(conversation, locale)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || conversation.messages.length === 0}
          aria-label={t('title')}
        >
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportText}>
          <FileText className="mr-2 h-4 w-4" />
          {t('text')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileCode className="mr-2 h-4 w-4" />
          {t('markdown')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf}>
          <FileType className="mr-2 h-4 w-4" />
          {t('pdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
