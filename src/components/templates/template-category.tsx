'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { TemplateCard } from './template-card'
import type { Template, TemplateCategory as TemplateCategoryType } from '@/types/template'
import { TEMPLATE_CATEGORIES } from '@/types/template'
import { cn } from '@/lib/utils'

interface TemplateCategoryProps {
  category: TemplateCategoryType
  templates: Template[]
  defaultOpen?: boolean
  onSelectTemplate: (prompt: string) => void
  onEditTemplate?: (template: Template) => void
  onDeleteTemplate?: (id: string) => void
}

export function TemplateCategory({
  category,
  templates,
  defaultOpen = true,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: TemplateCategoryProps) {
  const locale = useLocale() as 'ja' | 'en'
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const categoryName = TEMPLATE_CATEGORIES[category].name[locale]

  if (templates.length === 0) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent">
        <span>{categoryName}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={onSelectTemplate}
            onEdit={template.isCustom ? onEditTemplate : undefined}
            onDelete={template.isCustom ? onDeleteTemplate : undefined}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
