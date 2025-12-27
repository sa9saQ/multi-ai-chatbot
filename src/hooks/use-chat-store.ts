'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Conversation, ConversationSummary, Message } from '@/types/chat'
import type { AIModel, AIProvider, ThinkingLevel } from '@/types/ai'
import { AI_MODELS, getModelById, hasConfigurableThinking, supportsWebSearch } from '@/types/ai'
import { DEFAULT_SETTINGS } from '@/types/settings'
import { useSettingsStore } from './use-settings-store'

interface ChatState {
  conversations: Conversation[]
  currentConversationId: string | null
  selectedModelId: string
  selectedProvider: AIProvider
  thinkingLevel: ThinkingLevel
  webSearchEnabled: boolean
  // Track which conversation is currently generating (null = none)
  generatingConversationId: string | null
}

interface ChatActions {
  createConversation: () => string
  deleteConversation: (id: string) => void
  selectConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'createdAt'>) => void
  updateMessage: (conversationId: string, messageId: string, content: string) => void
  setSelectedModel: (modelId: string, provider: AIProvider) => void
  setThinkingLevel: (level: ThinkingLevel) => void
  setWebSearchEnabled: (enabled: boolean) => void
  setGeneratingConversationId: (conversationId: string | null) => void
  isGenerating: () => boolean // Computed: true if any conversation is generating
  getConversationSummaries: () => ConversationSummary[]
  getCurrentConversation: () => Conversation | null
  clearAllConversations: () => void
}

const generateId = () => crypto.randomUUID()
// Use DEFAULT_SETTINGS.defaultModelId to ensure affordable default model
// AI_MODELS[0] is unreliable after reordering (could be expensive model like o3)
const defaultModel = getModelById(DEFAULT_SETTINGS.defaultModelId) ?? AI_MODELS[0]

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      selectedModelId: defaultModel.id,
      selectedProvider: defaultModel.provider,
      thinkingLevel: 'medium' as ThinkingLevel, // Default thinking level
      webSearchEnabled: false, // Web search disabled by default
      generatingConversationId: null,

      createConversation: () => {
        const id = generateId()
        const now = new Date()
        // Use settings default model for new conversations
        const { settings } = useSettingsStore.getState()
        const userDefaultModel = getModelById(settings.defaultModelId)
        const modelId = userDefaultModel?.id ?? get().selectedModelId
        const provider = userDefaultModel?.provider ?? get().selectedProvider
        const newConversation: Conversation = {
          id,
          title: '',
          messages: [],
          modelId,
          provider,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
          // Also update selected model to match new conversation
          selectedModelId: modelId,
          selectedProvider: provider,
        }))
        return id
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id)
          // Check if we need to switch to a different conversation
          if (state.currentConversationId === id) {
            const newCurrentConversation = newConversations[0] ?? null
            if (newCurrentConversation) {
              // Switch to another conversation - also sync model selection
              return {
                conversations: newConversations,
                currentConversationId: newCurrentConversation.id,
                selectedModelId: newCurrentConversation.modelId,
                selectedProvider: newCurrentConversation.provider,
              }
            } else {
              // No conversations left - reset to user's configured default model
              // This matches the behavior in createConversation() for consistency
              const { settings } = useSettingsStore.getState()
              const userDefaultModel = getModelById(settings.defaultModelId) ?? defaultModel
              return {
                conversations: newConversations,
                currentConversationId: null,
                selectedModelId: userDefaultModel.id,
                selectedProvider: userDefaultModel.provider,
              }
            }
          }
          // Deleting a non-current conversation - just remove it
          return {
            conversations: newConversations,
          }
        })
      },

      selectConversation: (id) => {
        const conversation = get().conversations.find((c) => c.id === id)
        if (conversation) {
          set({
            currentConversationId: id,
            selectedModelId: conversation.modelId,
            selectedProvider: conversation.provider,
          })
        }
      },

      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: new Date() } : c
          ),
        }))
      },

      addMessage: (conversationId, message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          createdAt: new Date(),
        }
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            const updatedMessages = [...c.messages, newMessage]
            const title =
              c.title || (message.role === 'user' ? message.content.slice(0, 30) : c.title)
            return {
              ...c,
              messages: updatedMessages,
              title,
              updatedAt: new Date(),
            }
          }),
        }))
      },

      updateMessage: (conversationId, messageId, content) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
              updatedAt: new Date(),
            }
          }),
        }))
      },

      setSelectedModel: (modelId, provider) => {
        set({ selectedModelId: modelId, selectedProvider: provider })
        const currentId = get().currentConversationId
        if (currentId) {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === currentId ? { ...c, modelId, provider, updatedAt: new Date() } : c
            ),
          }))
        }
        // Reset thinking level to medium if new model doesn't support configurable thinking
        if (!hasConfigurableThinking(modelId)) {
          set({ thinkingLevel: 'medium' })
        }
        // Reset web search if new model doesn't support it
        if (!supportsWebSearch(modelId)) {
          set({ webSearchEnabled: false })
        }
      },

      setThinkingLevel: (level) => {
        set({ thinkingLevel: level })
      },

      setWebSearchEnabled: (enabled) => {
        set({ webSearchEnabled: enabled })
      },

      setGeneratingConversationId: (conversationId) => {
        set({ generatingConversationId: conversationId })
      },

      isGenerating: () => {
        return get().generatingConversationId !== null
      },

      getConversationSummaries: () => {
        return get().conversations.map((c) => ({
          id: c.id,
          title: c.title,
          provider: c.provider,
          modelId: c.modelId,
          messageCount: c.messages.length,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }))
      },

      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get()
        return conversations.find((c) => c.id === currentConversationId) ?? null
      },

      clearAllConversations: () => {
        // Reset to user's configured default model for consistency with deleteConversation
        const { settings } = useSettingsStore.getState()
        const userDefaultModel = getModelById(settings.defaultModelId) ?? defaultModel
        set({
          conversations: [],
          currentConversationId: null,
          selectedModelId: userDefaultModel.id,
          selectedProvider: userDefaultModel.provider,
        })
      },
    }),
    {
      name: 'multi-ai-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Exclude images from localStorage to avoid QuotaExceededError
        // Base64 images are too large for localStorage's 5MB limit
        // Images are only kept in memory during the session
        conversations: state.conversations.map((conv) => ({
          ...conv,
          messages: conv.messages.map((m) => ({
            ...m,
            images: undefined, // Don't persist images to localStorage
          })),
        })),
        currentConversationId: state.currentConversationId,
        selectedModelId: state.selectedModelId,
        selectedProvider: state.selectedProvider,
        thinkingLevel: state.thinkingLevel,
        webSearchEnabled: state.webSearchEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore Date objects from ISO strings after rehydration
        if (state?.conversations) {
          state.conversations = state.conversations.map((conv) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: conv.messages.map((m) => ({
              ...m,
              createdAt: new Date(m.createdAt),
            })),
          }))
        }
      },
    }
  )
)

export function getSelectedModel(): AIModel {
  const state = useChatStore.getState()
  return getModelById(state.selectedModelId) ?? AI_MODELS[0]
}
