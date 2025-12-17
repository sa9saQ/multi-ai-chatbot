'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/types/chat'
import { AI_PROVIDERS } from '@/types/ai'

interface SidebarItemProps {
  conversation: ConversationSummary
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
}

const MAX_TITLE_LENGTH = 100

export function SidebarItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: SidebarItemProps) {
  const t = useTranslations('sidebar')
  const tChat = useTranslations('chat')
  const tCommon = useTranslations('common')
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(conversation.title)
  const [isPending, startTransition] = React.useTransition()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleConfirmDelete = () => {
    if (isPending) return
    startTransition(() => {
      onDelete()
    })
  }

  // Sync local state when prop changes from parent
  React.useEffect(() => {
    setEditTitle(conversation.title)
  }, [conversation.title])

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmedTitle = editTitle.trim()
    if (
      trimmedTitle &&
      trimmedTitle !== conversation.title &&
      trimmedTitle.length <= MAX_TITLE_LENGTH
    ) {
      onRename(trimmedTitle)
    } else {
      setEditTitle(conversation.title)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(conversation.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const providerIcon = AI_PROVIDERS[conversation.provider]?.icon ?? '💬'

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 flex-1"
          maxLength={MAX_TITLE_LENGTH}
          aria-label={t('editTitle')}
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
          <Check className="h-4 w-4" />
          <span className="sr-only">{t('save')}</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
          <X className="h-4 w-4" />
          <span className="sr-only">{t('cancel')}</span>
        </Button>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-accent',
        isActive && 'bg-accent'
      )}
    >
      <span className="text-sm">{providerIcon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{conversation.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {conversation.messageCount} {t('messages')}
        </p>
      </div>
      <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          <Pencil className="h-3 w-3" />
          <span className="sr-only">{t('editTitle')}</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only">{t('deleteConversation')}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>{tChat('deleteConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {tChat('deleteConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                {tCommon('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={handleConfirmDelete}
                disabled={isPending}
              >
                {tCommon('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
