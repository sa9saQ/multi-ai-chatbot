'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react'
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

export function SidebarItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: SidebarItemProps) {
  const t = useTranslations('sidebar')
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(conversation.title)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmedTitle = editTitle.trim()
    if (trimmedTitle && trimmedTitle !== conversation.title) {
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
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
          <X className="h-4 w-4" />
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
          <span className="sr-only">{t('deleteConversation')}</span>
        </Button>
      </div>
    </div>
  )
}
