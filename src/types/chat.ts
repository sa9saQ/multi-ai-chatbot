import type { AIProvider, ThinkingLevel } from './ai'

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: Date
  modelId?: string
  images?: string[] // Base64 data URLs for attached images
  // Thinking metadata for reasoning models
  thinkingTime?: number // Seconds taken to generate response
  thinkingLevel?: ThinkingLevel // Thinking level used (low/medium/high)
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  modelId: string
  provider: AIProvider
  createdAt: Date
  updatedAt: Date
}

export interface ConversationSummary {
  id: string
  title: string
  provider: AIProvider
  modelId: string
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

export function createConversation(
  modelId: string,
  provider: AIProvider,
  title?: string
): Conversation {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    title: title ?? 'New Chat',
    messages: [],
    modelId,
    provider,
    createdAt: now,
    updatedAt: now,
  }
}

export function conversationToSummary(conversation: Conversation): ConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    provider: conversation.provider,
    modelId: conversation.modelId,
    messageCount: conversation.messages.length,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }
}
