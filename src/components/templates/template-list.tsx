'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TemplateCategory } from './template-category'
import { useShallow } from 'zustand/react/shallow'
import { useTemplatesStore } from '@/hooks/use-templates-store'
import type { Template, TemplateCategory as TemplateCategoryType } from '@/types/template'

// Category display order (custom templates at the end)
const CATEGORY_ORDER: TemplateCategoryType[] = ['coding', 'writing', 'translation', 'analysis', 'custom']

interface TemplateListProps {
  onSelectTemplate: (prompt: string) => void
  onCreateTemplate?: () => void
  onEditTemplate?: (template: Template) => void
  onDeleteTemplate?: (id: string) => void
}

export function TemplateList({
  onSelectTemplate,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: TemplateListProps) {
  const t = useTranslations('template')
  const deleteCustomTemplate = useTemplatesStore((state) => state.deleteCustomTemplate)
  // Use selector pattern with useShallow for stable reference
  const templates = useTemplatesStore(
    useShallow((state) => [...state.templates, ...state.customTemplates])
  )

  // Group templates by category
  const templatesByCategory = React.useMemo(() => {
    const grouped: Record<TemplateCategoryType, Template[]> = {
      coding: [],
      writing: [],
      translation: [],
      analysis: [],
      custom: [],
    }

    for (const template of templates) {
      grouped[template.category].push(template)
    }

    return grouped
  }, [templates])

  const handleDelete = (id: string) => {
    deleteCustomTemplate(id)
    onDeleteTemplate?.(id)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t('title')}</h2>
        {onCreateTemplate && (
          <Button variant="ghost" size="sm" onClick={onCreateTemplate}>
            <Plus className="mr-1 h-4 w-4" />
            {t('create')}
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {CATEGORY_ORDER.map((category) => (
            <TemplateCategory
              key={category}
              category={category}
              templates={templatesByCategory[category]}
              defaultOpen={category !== 'custom'}
              onSelectTemplate={onSelectTemplate}
              onEditTemplate={onEditTemplate}
              onDeleteTemplate={handleDelete}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
