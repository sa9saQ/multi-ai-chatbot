'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Template } from '@/types/template'
import { TEMPLATE_CATEGORIES } from '@/types/template'

interface TemplateCardProps {
  template: Template
  onSelect: (prompt: string) => void
  onEdit?: (template: Template) => void
  onDelete?: (id: string) => void
}

export function TemplateCard({ template, onSelect, onEdit, onDelete }: TemplateCardProps) {
  const rawLocale = useLocale()
  const locale: 'ja' | 'en' = rawLocale === 'ja' || rawLocale === 'en' ? rawLocale : 'en'
  const t = useTranslations('template')
  const tCommon = useTranslations('common')

  const handleSelect = () => {
    onSelect(template.prompt[locale])
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(template)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(template.id)
  }

  const categoryName = TEMPLATE_CATEGORIES[template.category].name[locale]

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e) => {
        // Prevent handling keyboard events from child elements (edit/delete buttons)
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleSelect()
        }
      }}
      className={cn(
        'group cursor-pointer transition-colors hover:bg-accent',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      <CardContent className="flex items-start justify-between p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{template.name[locale]}</span>
            {template.isCustom && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {t('custom')}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{categoryName}</p>
        </div>
        {template.isCustom && (
          <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEdit}
              aria-label={tCommon('edit')}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label={tCommon('delete')}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
