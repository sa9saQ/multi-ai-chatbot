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
import { getModelById } from '@/types/ai'
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
  const isHydrated = useSettingsStore((state) => state.isHydrated)

  const [apiKey, setApiKey] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState('')
  const [attachedImages, setAttachedImages] = React.useState<string[]>([])

  // Track the latest conversationId to avoid stale closure in onFinish callback
  const conversationIdRef = React.useRef<string | null>(currentConversationId)

  // Get current model info
  const currentModel = getModelById(selectedModelId)
  const supportsVision = currentModel?.supportsVision ?? false

  React.useEffect(() => {
    const loadApiKey = async () => {
      const key = await getApiKey(selectedProvider)
      setApiKey(key)
    }
    loadApiKey()
  }, [selectedProvider, getApiKey])

  // Track latest values in refs to avoid stale closures
  const modelIdRef = React.useRef(selectedModelId)
  const providerRef = React.useRef(selectedProvider)
  const apiKeyRef = React.useRef(apiKey)

  React.useEffect(() => {
    modelIdRef.current = selectedModelId
    providerRef.current = selectedProvider
    apiKeyRef.current = apiKey
  }, [selectedModelId, selectedProvider, apiKey])

  const { messages, append, status, setMessages } = useChat({
    api: '/api/chat',
    // Default body (can be overridden in append)
    body: {
      modelId: selectedModelId,
      provider: selectedProvider,
      apiKey,
    },
    // Force re-initialization when model/provider changes
    id: `${selectedProvider}-${selectedModelId}`,
    initialMessages:
      conversation?.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })) ?? [],
    // Custom fetch to debug request body
    fetch: async (url, options) => {
      if (options?.body) {
        try {
          const bodyData = JSON.parse(options.body as string)
          console.log('[useChat fetch] Body keys:', Object.keys(bodyData))
          console.log('[useChat fetch] Has images:', 'images' in bodyData, 'Count:', bodyData.images?.length ?? 0)
        } catch {
          console.log('[useChat fetch] Could not parse body')
        }
      }
      return fetch(url, options)
    },
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
          modelId: modelIdRef.current,
        })
      }
    },
    onError: (error) => {
      setIsGenerating(false)
      console.error('Chat error:', error)
      // Show more detailed error message
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Chat error details:', errorMessage)
      toast.error(errorMessage || t('errorOccurred'))
    },
  })

  // Sync messages when switching conversations OR when model changes (due to id change in useChat)
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
  }, [currentConversationId, selectedModelId, selectedProvider, setMessages])

  const isLoading = status === 'streaming' || status === 'submitted'

  const handleSubmit = async () => {
    // Guard against double submission (Enter key bypasses disabled attribute)
    if (isLoading) return
    if (!inputValue.trim() && attachedImages.length === 0) return

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

    // Build message content - capture images before clearing state
    const userMessage = inputValue
    const imagesToSend = [...attachedImages]

    // Debug logging
    console.log('[ChatArea] handleSubmit - attachedImages:', attachedImages.length)
    console.log('[ChatArea] handleSubmit - imagesToSend:', imagesToSend.length)

    // Save to store (text only for now)
    addMessage(convId, {
      role: 'user',
      content: userMessage || (imagesToSend.length > 0 ? '[画像を送信しました]' : ''),
    })

    // Clear inputs
    setInputValue('')
    setAttachedImages([])

    // Send message
    const messageContent = imagesToSend.length > 0
      ? (userMessage.trim() || 'この画像について説明してください。')
      : userMessage

    // Convert images to experimental_attachments format
    const attachments = imagesToSend.map((base64, index) => ({
      name: `image-${index}.png`,
      contentType: 'image/png',
      url: base64, // data URL
    }))

    console.log('[ChatArea] append with attachments:', attachments.length)

    await append(
      {
        role: 'user',
        content: messageContent,
        experimental_attachments: attachments.length > 0 ? attachments : undefined,
      },
      {
        body: {
          modelId: selectedModelId,
          provider: selectedProvider,
          apiKey,
        },
      }
    )
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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b p-2">
        <ModelSelector />
        {conversation && <ExportMenu conversation={conversation} disabled={isLoading} />}
      </div>

      <MessageList messages={displayMessages} isLoading={isLoading} className="min-h-0 flex-1" />

      <div className="shrink-0 border-t bg-background p-4">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          images={attachedImages}
          onImagesChange={setAttachedImages}
          onSubmit={handleSubmit}
          disabled={isLoading || !isHydrated || !hasApiKey(selectedProvider)}
          supportsVision={supportsVision}
        />
      </div>
    </div>
  )
}
