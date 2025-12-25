'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ModelSelector } from './model-selector'
import { ThinkingLevelSelector } from './thinking-level-selector'
import { WebSearchToggle } from './web-search-toggle'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { ExportMenu } from '@/components/export'
import { useChatStore } from '@/hooks/use-chat-store'
import { useSettingsStore } from '@/hooks/use-settings-store'
import { getModelById, type ThinkingLevel } from '@/types/ai'
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
    thinkingLevel,
    webSearchEnabled,
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
  // Track encryptedKeys changes to re-fetch API key when user updates it for the same provider
  const encryptedKeys = useSettingsStore((state) => state.encryptedKeys)

  const [apiKey, setApiKey] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState('')
  const [attachedImages, setAttachedImages] = React.useState<string[]>([])

  // Get current model info
  const currentModel = getModelById(selectedModelId)
  const supportsVision = currentModel?.supportsVision ?? false

  // Clear attached images when switching to non-vision model
  React.useEffect(() => {
    if (!supportsVision) {
      setAttachedImages(prev => prev.length > 0 ? [] : prev)
    }
  }, [supportsVision])

  // Version tracking to prevent race conditions when provider changes rapidly
  // Each provider change increments version; stale async callbacks are ignored
  const providerVersionRef = React.useRef(0)

  // Track the current provider's encrypted key to trigger re-fetch when updated
  const currentProviderKey = encryptedKeys[selectedProvider]

  React.useEffect(() => {
    // Increment version for this effect run
    const currentVersion = ++providerVersionRef.current
    const loadApiKey = async () => {
      const key = await getApiKey(selectedProvider)
      // Only update state if this is still the current version
      // (prevents stale Promise from overwriting newer provider's key)
      if (currentVersion === providerVersionRef.current) {
        setApiKey(key)
      }
    }
    loadApiKey()
    // Re-fetch when provider changes OR when the current provider's key is updated
  }, [selectedProvider, getApiKey, currentProviderKey])

  // Store request context for onFinish callback (only one active request at a time due to isLoading guard)
  // This ref is set before calling append() and read in onFinish to save the message to the correct conversation
  // Includes timing data for thinking models
  const pendingContextRef = React.useRef<{
    convId: string
    modelId: string
    startTime: number // Date.now() when thinking started
    thinkingLevel: ThinkingLevel
    isThinkingModel: boolean
  } | null>(null)

  // Flag to skip message sync during handleSubmit flow
  // Prevents race condition: createConversation triggers useEffect which would load
  // the user message we just added, then append() adds it again → double message
  const skipSyncRef = React.useRef(false)

  const { messages, append, status, setMessages } = useChat({
    api: '/api/chat',
    // Default body (can be overridden in append)
    body: {
      modelId: selectedModelId,
      provider: selectedProvider,
      apiKey,
      thinkingLevel,
      webSearchEnabled,
    },
    // Force re-initialization when model/provider changes
    id: `${selectedProvider}-${selectedModelId}`,
    initialMessages:
      conversation?.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })) ?? [],
    onFinish: (message) => {
      setIsGenerating(false)
      // Use pendingContextRef to get the context captured at submit time
      // This avoids stale closure issues since onFinish is called with the correct message
      const context = pendingContextRef.current
      if (context) {
        // Calculate thinking time for reasoning models
        const thinkingTime = context.isThinkingModel
          ? Math.round((Date.now() - context.startTime) / 1000)
          : undefined
        addMessage(context.convId, {
          role: 'assistant',
          content: message.content,
          modelId: context.modelId,
          // Include thinking metadata for reasoning models
          ...(context.isThinkingModel && {
            thinkingTime,
            thinkingLevel: context.thinkingLevel,
          }),
        })
        pendingContextRef.current = null
      }
    },
    onError: (error) => {
      setIsGenerating(false)
      pendingContextRef.current = null
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(errorMessage || t('errorOccurred'), { id: 'chat-error' })
    },
  })

  // Sync messages when switching conversations OR when model changes (due to id change in useChat)
  React.useEffect(() => {
    // Skip sync during handleSubmit flow to prevent double message
    // (createConversation triggers this effect, but we're about to append the message manually)
    if (skipSyncRef.current) {
      return
    }
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
          createdAt: m.createdAt,
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

    // Create conversation if needed
    // Capture current model/provider (may be updated by createConversation)
    let convId = currentConversationId
    let effectiveModelId = selectedModelId
    let effectiveProvider = selectedProvider
    let effectiveApiKey = apiKey
    if (!convId) {
      // Set flag to skip message sync - prevents double message from useEffect
      // The effect would run due to currentConversationId change, but we'll manually append
      skipSyncRef.current = true
      convId = createConversation()
      // Get fresh state after conversation creation (it updates selectedModelId/selectedProvider)
      const freshState = useChatStore.getState()
      effectiveModelId = freshState.selectedModelId
      effectiveProvider = freshState.selectedProvider

      // If provider changed (user's default model is from different provider),
      // we need to fetch the correct API key for the new provider
      if (effectiveProvider !== selectedProvider) {
        if (!hasApiKey(effectiveProvider)) {
          skipSyncRef.current = false // Clear flag on early return
          toast.error(t('apiKeyMissing'))
          return
        }
        // Fetch API key for the effective provider
        const newApiKey = await getApiKey(effectiveProvider)
        if (!newApiKey) {
          skipSyncRef.current = false // Clear flag on early return
          toast.error(t('apiKeyLoading'))
          return
        }
        effectiveApiKey = newApiKey
      }
    }

    // Build message content - capture images before clearing state
    const userMessage = inputValue
    const imagesToSend = [...attachedImages]

    // Determine the actual message content to send to API
    // Use the same content for both saving and sending to ensure consistency
    const messageContent = imagesToSend.length > 0
      ? (userMessage.trim() || t('describeImage'))
      : userMessage

    // Save user message to store (same content as sent to API for consistency)
    // Include images so they can be displayed in the chat history
    addMessage(convId, {
      role: 'user',
      content: messageContent || (imagesToSend.length > 0 ? t('describeImage') : ''),
      images: imagesToSend.length > 0 ? imagesToSend : undefined,
    })

    // Clear inputs
    setInputValue('')
    setAttachedImages(prev => prev.length > 0 ? [] : prev)

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

    // Store context for onFinish callback before starting the request
    // This avoids stale closure issues - onFinish reads from this ref
    // Include timing data for calculating thinking time in reasoning models
    const effectiveModel = getModelById(effectiveModelId)
    pendingContextRef.current = {
      convId,
      modelId: effectiveModelId,
      startTime: Date.now(),
      thinkingLevel,
      isThinkingModel: effectiveModel?.supportsThinking ?? false,
    }
    setIsGenerating(true)
    try {
      await append(
        {
          role: 'user',
          content: messageContent,
          experimental_attachments: attachments.length > 0 ? attachments : undefined,
        },
        {
          body: {
            modelId: effectiveModelId,
            provider: effectiveProvider,
            apiKey: effectiveApiKey,
            thinkingLevel,
            webSearchEnabled,
          },
        }
      )
      // Note: Message saving is handled by onFinish callback which has access to
      // the correct message content and pendingContextRef for conversation context
    } catch (error) {
      // Synchronous errors (before request starts) - cleanup context
      // Async errors are handled by onError callback
      pendingContextRef.current = null
      setIsGenerating(false)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(errorMessage || t('errorOccurred'), { id: 'chat-error' })
    } finally {
      // Clear skip flag after append completes (success or failure)
      // This allows future conversation switches to sync messages normally
      skipSyncRef.current = false
    }
  }

  const displayMessages: Message[] = React.useMemo(() => {
    // Merge AI SDK messages with stored metadata from conversation
    // AI SDK doesn't persist images or thinking metadata, so we retrieve them from our store
    // Use index-based matching since both arrays are in the same order
    // (content+role matching fails with duplicate messages)
    const storedMessages = conversation?.messages ?? []

    return messages
      .filter((m) => isSupportedRole(m.role))
      .map((m, index) => {
        // Match by index - storedMessages and messages should be in sync
        const storedMessage = storedMessages[index]
        return {
          id: m.id,
          role: m.role as MessageRole,
          content: m.content,
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          images: storedMessage?.images,
          thinkingTime: storedMessage?.thinkingTime,
          thinkingLevel: storedMessage?.thinkingLevel,
        }
      })
  }, [messages, conversation?.messages])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b p-2">
        <div className="flex items-center gap-2">
          <ModelSelector />
          <ThinkingLevelSelector />
          <WebSearchToggle />
        </div>
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
