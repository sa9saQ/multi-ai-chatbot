'use client'

import * as React from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarItem } from './sidebar-item'
import { useChatStore } from '@/hooks/use-chat-store'
import { useMounted } from '@/hooks/use-mounted'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const locale = useLocale()
  const t = useTranslations('sidebar')
  const mounted = useMounted()
  const {
    currentConversationId,
    generatingConversationId,
    createConversation,
    deleteConversation,
    selectConversation,
    updateConversationTitle,
    getConversationSummaries,
  } = useChatStore()

  // Only get conversations after mount to avoid hydration mismatch
  // (localStorage data differs between server and client)
  const conversations = mounted ? getConversationSummaries() : []

  const handleNewChat = () => {
    if (generatingConversationId) return
    createConversation()
  }

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r bg-muted/30',
        className
      )}
    >
      <div className="p-2">
        <Button className="w-full justify-start gap-2" onClick={handleNewChat} disabled={generatingConversationId !== null}>
          <Plus className="h-4 w-4" />
          {t('newChat')}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-2">
          {conversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {t('noConversations')}
            </p>
          ) : (
            conversations.map((conversation) => (
              <SidebarItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                isGenerating={conversation.id === generatingConversationId}
                onSelect={() => selectConversation(conversation.id)}
                onDelete={() => deleteConversation(conversation.id)}
                onRename={(title) => updateConversationTitle(conversation.id, title)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-2">
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href={`/${locale}/settings`}>
            <Settings className="h-4 w-4" />
            {t('settings')}
          </Link>
        </Button>
      </div>
    </aside>
  )
}
