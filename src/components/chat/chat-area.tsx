'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ModelSelector } from './model-selector'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { ExportMenu } from '@/components/export'
import { useChatStore } from '@/hooks/use-chat-store'
import { useSettingsStore } from '@/hooks/use-settings-store'
import type { Message, MessageRole } from '@/types/chat'

// Type guard for supported message roles
const SUPPORTED_ROLES: readonly MessageRole[] = ['user', 'assistant'] as const
function isSupportedRole(role: string): role is MessageRole {
  return SUPPORTED_ROLES.includes(role as MessageRole)
}

export function ChatArea() {
  const t = useTranslations('chat')
  const {
    currentConversationId,
    selectedModelId,
    selectedProvider,
    addMessage,
    setIsGenerating,
    createConversation,
  } = useChatStore()
  // Use Zustand selector to properly track conversation changes (including new messages)
  const conversation = useChatStore((state) =>
    state.conversations.find((c) => c.id === state.currentConversationId) ?? null
  )
  const { getApiKey, hasApiKey } = useSettingsStore()

  const [apiKey, setApiKey] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState('')

  // Track the latest conversationId to avoid stale closure in onFinish callback
  const conversationIdRef = React.useRef<string | null>(currentConversationId)

  React.useEffect(() => {
    const loadApiKey = async () => {
      const key = await getApiKey(selectedProvider)
      setApiKey(key)
    }
    loadApiKey()
  }, [selectedProvider, getApiKey])

  const { messages, append, status, setMessages } = useChat({
    api: '/api/chat',
    body: {
      modelId: selectedModelId,
      provider: selectedProvider,
      apiKey,
    },
    initialMessages:
      conversation?.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })) ?? [],
    onResponse: () => {
      setIsGenerating(true)
    },
    onFinish: (message) => {
      setIsGenerating(false)
      // Use ref to get the latest conversationId, avoiding stale closure
      const convId = conversationIdRef.current
      if (convId) {
        addMessage(convId, {
          role: 'assistant',
          content: message.content,
          modelId: selectedModelId,
        })
      }
    },
    onError: (error) => {
      setIsGenerating(false)
      console.error('Chat error:', error)
      toast.error(t('errorOccurred'))
    },
  })

  // Sync messages only when switching conversations (ID change)
  // We intentionally omit 'conversation' to avoid syncing on every message addition,
  // which would interfere with useChat's internal state during streaming
  React.useEffect(() => {
    // Get fresh conversation state from store (not from reactive selector)
    const { conversations, currentConversationId: convId } = useChatStore.getState()
    const conv = conversations.find((c) => c.id === convId) ?? null
    const newMessages =
      conv?.messages
        .filter((m) => isSupportedRole(m.role))
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })) ?? []
    setMessages(newMessages)
  }, [currentConversationId, setMessages])

  const isLoading = status === 'streaming' || status === 'submitted'

  const handleSubmit = async () => {
    // Guard against double submission (Enter key bypasses disabled attribute)
    if (isLoading) return
    if (!inputValue.trim()) return

    if (!hasApiKey(selectedProvider)) {
      toast.error(t('apiKeyMissing'))
      return
    }

    // Create conversation first if needed, and update ref immediately
    let convId = currentConversationId
    if (!convId) {
      convId = createConversation()
    }
    conversationIdRef.current = convId

    addMessage(convId, {
      role: 'user',
      content: inputValue,
    })

    const userMessage = inputValue
    setInputValue('')

    await append({
      role: 'user',
      content: userMessage,
    })
  }

  const displayMessages: Message[] = React.useMemo(() => {
    return messages
      .filter((m) => isSupportedRole(m.role))
      .map((m) => ({
        id: m.id,
        role: m.role as MessageRole,
        content: m.content,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      }))
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-2">
        <ModelSelector />
        {conversation && <ExportMenu conversation={conversation} disabled={isLoading} />}
      </div>

      <MessageList messages={displayMessages} isLoading={isLoading} className="flex-1" />

      <div className="border-t p-4">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={isLoading || !hasApiKey(selectedProvider)}
        />
      </div>
    </div>
  )
}
