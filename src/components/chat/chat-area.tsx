'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ModelSelector } from './model-selector'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { useChatStore } from '@/hooks/use-chat-store'
import { useSettingsStore } from '@/hooks/use-settings-store'
import type { Message } from '@/types/chat'

export function ChatArea() {
  const t = useTranslations('chat')
  const {
    currentConversationId,
    selectedModelId,
    selectedProvider,
    getCurrentConversation,
    addMessage,
    setIsGenerating,
    createConversation,
  } = useChatStore()
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

  const conversation = getCurrentConversation()

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

  // Sync messages when conversation changes
  // useChat's initialMessages only applies on mount, so we need to manually sync
  React.useEffect(() => {
    const newMessages =
      conversation?.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })) ?? []
    setMessages(newMessages)
  }, [currentConversationId, setMessages]) // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = status === 'streaming' || status === 'submitted'

  const handleSubmit = async () => {
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
    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
    }))
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <ModelSelector />
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
