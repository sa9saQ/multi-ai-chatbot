'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Download, FileText, FileCode, FileType, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExportText = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const { exportConversationAsText } = await import('@/lib/export')
      exportConversationAsText(conversation, locale)
    } catch (error) {
      console.error('Failed to load export module:', error)
      toast.error(t('error'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportMarkdown = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const { exportConversationAsMarkdown } = await import('@/lib/export')
      exportConversationAsMarkdown(conversation, locale)
    } catch (error) {
      console.error('Failed to load export module:', error)
      toast.error(t('error'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPdf = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const { exportConversationAsPdf } = await import('@/lib/export')
      exportConversationAsPdf(conversation, locale)
    } catch (error) {
      console.error('Failed to load export module:', error)
      toast.error(t('error'))
    } finally {
      setIsExporting(false)
    }
  }

  const isDisabled = disabled || conversation.messages.length === 0 || isExporting

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isDisabled}
          aria-label={isExporting ? t('exporting') : t('title')}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportText} disabled={isExporting}>
          <FileText className="mr-2 h-4 w-4" />
          {t('text')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportMarkdown} disabled={isExporting}>
          <FileCode className="mr-2 h-4 w-4" />
          {t('markdown')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf} disabled={isExporting}>
          <FileType className="mr-2 h-4 w-4" />
          {t('pdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
