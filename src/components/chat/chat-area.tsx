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

// Extract and validate MIME type from data URL (module level to avoid recreation)
function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  const mimeType = match?.[1] ?? 'image/png'
  // Validate it's an image type, fallback to image/png if not
  return mimeType.startsWith('image/') ? mimeType : 'image/png'
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
    // Note: onFinish/onResponse removed - logic moved to handleSubmit with await
    // to properly capture per-request context in closures (fixes race condition)
    onError: (error) => {
      setIsGenerating(false)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(errorMessage || t('errorOccurred'))
    },
  })

  // Track latest messages in ref for reading after await append()
  const messagesRef = React.useRef(messages)
  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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

    // Guard against race condition: apiKey state may not be loaded yet after provider switch
    if (!apiKey) {
      toast.error(t('apiKeyLoading'))
      return
    }

    // Capture values at submit time as local const variables (not refs)
    // This ensures each request has its own closure-captured context that can't be overwritten
    // by subsequent requests, fixing the race condition when switching conversations
    let convIdAtSubmit = currentConversationId
    if (!convIdAtSubmit) {
      convIdAtSubmit = createConversation()
    }
    const modelIdAtSubmit = selectedModelId

    // Build message content - capture images before clearing state
    const userMessage = inputValue
    const imagesToSend = [...attachedImages]

    // Save to store (text only for now)
    addMessage(convIdAtSubmit, {
      role: 'user',
      content: userMessage || (imagesToSend.length > 0 ? t('imageSent') : ''),
    })

    // Clear inputs
    setInputValue('')
    setAttachedImages([])

    // Send message
    const messageContent = imagesToSend.length > 0
      ? (userMessage.trim() || t('describeImage'))
      : userMessage

    // Convert images to experimental_attachments format
    const attachments = imagesToSend.map((base64, index) => {
      const mimeType = getMimeType(base64)
      const ext = mimeType.split('/')[1] ?? 'png'
      return {
        name: `image-${index}.${ext}`,
        contentType: mimeType,
        url: base64,
      }
    })

    try {
      setIsGenerating(true)

      // await ensures we stay in this closure until streaming completes
      // This way convIdAtSubmit and modelIdAtSubmit remain correct even if
      // user switches conversations or models during streaming
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

      // After streaming completes, get the last assistant message from fresh messages ref
      const currentMessages = messagesRef.current
      const lastMessage = currentMessages[currentMessages.length - 1]
      if (lastMessage?.role === 'assistant') {
        addMessage(convIdAtSubmit, {
          role: 'assistant',
          content: lastMessage.content,
          modelId: modelIdAtSubmit,
        })
      }
    } catch {
      // Error toast is already handled by useChat's onError callback
      // We catch here only to ensure the finally block runs for cleanup
    } finally {
      setIsGenerating(false)
    }
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
