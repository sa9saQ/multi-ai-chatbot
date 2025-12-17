'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useTemplatesStore } from '@/hooks/use-templates-store'
import type { Template } from '@/types/template'

interface TemplateEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: Template | null
}

const MAX_NAME_LENGTH = 50
const MAX_PROMPT_LENGTH = 2000

export function TemplateEditor({ open, onOpenChange, template }: TemplateEditorProps) {
  const t = useTranslations('template')
  const tCommon = useTranslations('common')
  const { addCustomTemplate, updateCustomTemplate } = useTemplatesStore()

  const [nameJa, setNameJa] = React.useState('')
  const [nameEn, setNameEn] = React.useState('')
  const [promptJa, setPromptJa] = React.useState('')
  const [promptEn, setPromptEn] = React.useState('')

  const isEditing = Boolean(template)

  // Sync form state when template prop changes or dialog opens
  React.useEffect(() => {
    if (!open) return
    if (template) {
      setNameJa(template.name.ja)
      setNameEn(template.name.en)
      setPromptJa(template.prompt.ja)
      setPromptEn(template.prompt.en)
    } else {
      setNameJa('')
      setNameEn('')
      setPromptJa('')
      setPromptEn('')
    }
  }, [open, template])

  const isValid =
    nameJa.trim().length > 0 &&
    nameEn.trim().length > 0 &&
    promptJa.trim().length > 0 &&
    promptEn.trim().length > 0

  const handleSave = () => {
    if (!isValid) return

    const name = { ja: nameJa.trim(), en: nameEn.trim() }
    const prompt = { ja: promptJa.trim(), en: promptEn.trim() }

    if (isEditing && template) {
      updateCustomTemplate(template.id, { name, prompt, category: 'custom' })
    } else {
      addCustomTemplate({ name, prompt, category: 'custom' })
    }

    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? tCommon('edit') : t('create')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name-ja">{t('name')} ({tCommon('languageJa')})</Label>
            <Input
              id="name-ja"
              value={nameJa}
              onChange={(e) => setNameJa(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={t('namePlaceholderJa')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name-en">{t('name')} ({tCommon('languageEn')})</Label>
            <Input
              id="name-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={t('namePlaceholderEn')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-ja">{t('prompt')} ({tCommon('languageJa')})</Label>
            <Textarea
              id="prompt-ja"
              value={promptJa}
              onChange={(e) => setPromptJa(e.target.value)}
              maxLength={MAX_PROMPT_LENGTH}
              rows={3}
              placeholder={t('promptPlaceholderJa')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-en">{t('prompt')} ({tCommon('languageEn')})</Label>
            <Textarea
              id="prompt-en"
              value={promptEn}
              onChange={(e) => setPromptEn(e.target.value)}
              maxLength={MAX_PROMPT_LENGTH}
              rows={3}
              placeholder={t('promptPlaceholderEn')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
