'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
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

// AI SDK v6 message part types
type MessagePart = { type: string; text?: string }

// Helper to extract text content from AI SDK v6 message parts
function extractTextFromParts(parts?: MessagePart[]): string {
  return parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('') ?? ''
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
    setGeneratingConversationId,
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
  // Counter to trigger re-sync after skipSyncRef is cleared (handles navigation during request)
  const [syncTrigger, setSyncTrigger] = React.useState(0)
  // Track previous conversation ID to detect actual conversation switches (not status changes)
  const prevConversationIdRef = React.useRef<string | null>(currentConversationId)

  // Memoize transport to prevent recreation on every render
  const transport = React.useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    []
  )

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
    // Force re-initialization when model/provider changes
    id: `${selectedProvider}-${selectedModelId}`,
    // AI SDK v6: Use 'messages' instead of 'initialMessages', with parts array
    messages:
      conversation?.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
        createdAt: m.createdAt,
      })) ?? [],
    onFinish: ({ message }: { message: { parts?: MessagePart[] } }) => {
      setGeneratingConversationId(null)
      // Use pendingContextRef to get the context captured at submit time
      // This avoids stale closure issues since onFinish is called with the correct message
      const context = pendingContextRef.current
      if (context) {
        // Calculate thinking time for reasoning models
        const thinkingTime = context.isThinkingModel
          ? Math.round((Date.now() - context.startTime) / 1000)
          : undefined
        // AI SDK v6: Extract text content from message parts using helper
        const textContent = extractTextFromParts(message.parts)
        addMessage(context.convId, {
          role: 'assistant',
          content: textContent,
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
      setGeneratingConversationId(null)
      pendingContextRef.current = null
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(errorMessage || t('errorOccurred'), { id: 'chat-error' })
    },
  })

  // Stable ref for stop function to call from useEffect without adding to deps
  const stopRef = React.useRef(stop)
  stopRef.current = stop

  // Sync messages when switching conversations OR when model changes (due to id change in useChat)
  React.useEffect(() => {
    // Only stop ongoing generation when conversation actually changes (not on status changes)
    // This prevents: status='submitted' → effect fires → stop() → generation aborted immediately
    const conversationChanged = prevConversationIdRef.current !== currentConversationId
    if (conversationChanged) {
      // Stop background streaming from previous conversation
      stopRef.current()
      // Clear pending context to prevent stale onFinish from adding message to wrong conversation
      pendingContextRef.current = null
      prevConversationIdRef.current = currentConversationId
    }
    // Skip sync during handleSubmit flow to prevent double message
    // (createConversation triggers this effect, but we're about to append the message manually)
    if (skipSyncRef.current) {
      return
    }
    // Get fresh conversation state from store (not from reactive selector)
    const { conversations, currentConversationId: convId } = useChatStore.getState()
    const conv = conversations.find((c) => c.id === convId) ?? null
    // AI SDK v6: Use parts array format for messages
    const newMessages =
      conv?.messages
        .filter((m) => isSupportedRole(m.role))
        .map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: m.content }],
          createdAt: m.createdAt,
        })) ?? []
    setMessages(newMessages)
  }, [currentConversationId, selectedModelId, selectedProvider, setMessages, syncTrigger])

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

    // Wrap in try-finally to ensure skipSyncRef is always cleared
    // This covers createConversation(), getApiKey(), and all subsequent operations
    try {
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
          toast.error(t('apiKeyMissing'))
          return
        }
        // Fetch API key for the effective provider
        const newApiKey = await getApiKey(effectiveProvider)
        if (!newApiKey) {
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
    setGeneratingConversationId(convId)
    try {
      // AI SDK v6: Use sendMessage with text property
      // For images, we pass them in the body to be processed server-side
      await sendMessage(
        { text: messageContent },
        {
          body: {
            modelId: effectiveModelId,
            provider: effectiveProvider,
            apiKey: effectiveApiKey,
            thinkingLevel,
            webSearchEnabled,
            // Pass images in body for server-side processing
            images: imagesToSend.length > 0 ? imagesToSend : undefined,
          },
        }
      )
      // Note: Message saving is handled by onFinish callback which has access to
      // the correct message content and pendingContextRef for conversation context
    } catch (error) {
      // Synchronous errors (before request starts) - cleanup context
      // Async errors are handled by onError callback
      pendingContextRef.current = null
      setGeneratingConversationId(null)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(errorMessage || t('errorOccurred'), { id: 'chat-error' })
    }
    } finally {
      // Clear skip flag after operation completes (success or failure)
      // This allows future conversation switches to sync messages normally
      // Outer finally ensures cleanup even if errors occur before inner try
      skipSyncRef.current = false
      // Trigger re-sync in case navigation occurred while flag was set
      setSyncTrigger((prev) => prev + 1)
    }
  }

  const displayMessages: Message[] = React.useMemo(() => {
    // Merge AI SDK messages with stored metadata from conversation
    // AI SDK doesn't persist images or thinking metadata, so we retrieve them from our store
    const storedMessages = conversation?.messages ?? []

    // When NOT streaming, prefer stored messages as the source of truth
    // This fixes the issue where thinking models send empty content during thinking phase
    // and AI SDK messages may not update properly after streaming completes
    if (!isLoading && storedMessages.length > 0) {
      return storedMessages
        .filter((m) => isSupportedRole(m.role))
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          images: m.images,
          thinkingTime: m.thinkingTime,
          thinkingLevel: m.thinkingLevel,
        }))
    }

    // During streaming, use AI SDK messages for real-time updates
    // Filter out tool-only messages (web search intermediate steps without content)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.filter((m: any) => {
      // Keep only user/assistant roles
      if (!isSupportedRole(m.role)) return false
      // AI SDK v6: Check for content in parts array using helper
      const textContent = extractTextFromParts(m.parts)
      const hasContent = textContent.trim().length > 0
      // Filter out messages that ONLY have tool invocations without content
      const hasToolParts = m.parts?.some((p: { type: string }) => p.type === 'tool-invocation')
      if (hasToolParts && !hasContent) return false
      return true
    })

    // Build ID-to-message map for robust metadata retrieval (avoids index mismatch issues)
    const storedMessageMap = new Map(storedMessages.map((m) => [m.id, m]))

    return filteredMessages.map((m: { id: string; role: string; parts?: MessagePart[]; createdAt?: Date }) => {
      // Match by ID for robust metadata retrieval (index-based matching is fragile)
      const storedMessage = storedMessageMap.get(m.id)
      // AI SDK v6: Extract text content from parts using helper
      const textContent = extractTextFromParts(m.parts)
      return {
        id: m.id,
        role: m.role as MessageRole,
        content: textContent,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        images: storedMessage?.images,
        thinkingTime: storedMessage?.thinkingTime,
        thinkingLevel: storedMessage?.thinkingLevel,
      }
    })
  }, [messages, conversation?.messages, isLoading])

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
