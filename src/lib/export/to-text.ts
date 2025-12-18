import type { Conversation, Message } from '@/types/chat'
import { AI_MODELS } from '@/types/ai'

interface ExportOptions {
  locale: 'ja' | 'en'
}

function formatDate(date: Date, locale: 'ja' | 'en'): string {
  return date.toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMessageTime(date: Date, locale: 'ja' | 'en'): string {
  return date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRoleName(role: Message['role'], locale: 'ja' | 'en'): string {
  if (locale === 'ja') {
    return role === 'user' ? 'ユーザー' : 'AI'
  }
  return role === 'user' ? 'User' : 'AI'
}

function getModelName(modelId: string): string {
  const model = AI_MODELS.find((m) => m.id === modelId)
  return model?.name ?? modelId
}

export function conversationToText(
  conversation: Conversation,
  options: ExportOptions
): string {
  const { locale } = options
  const lines: string[] = []

  // Header
  if (locale === 'ja') {
    lines.push('=' .repeat(60))
    lines.push(`会話タイトル: ${conversation.title}`)
    lines.push(`作成日時: ${formatDate(conversation.createdAt, locale)}`)
    lines.push(`最終更新: ${formatDate(conversation.updatedAt, locale)}`)
    lines.push(`AIモデル: ${getModelName(conversation.modelId)}`)
    lines.push(`メッセージ数: ${conversation.messages.length}`)
    lines.push('='.repeat(60))
  } else {
    lines.push('='.repeat(60))
    lines.push(`Title: ${conversation.title}`)
    lines.push(`Created: ${formatDate(conversation.createdAt, locale)}`)
    lines.push(`Last Updated: ${formatDate(conversation.updatedAt, locale)}`)
    lines.push(`AI Model: ${getModelName(conversation.modelId)}`)
    lines.push(`Messages: ${conversation.messages.length}`)
    lines.push('='.repeat(60))
  }

  lines.push('')

  // Messages
  for (const message of conversation.messages) {
    const roleName = getRoleName(message.role, locale)
    const time = formatMessageTime(message.createdAt, locale)

    lines.push(`[${time}] ${roleName}:`)
    lines.push(message.content)
    lines.push('')
    lines.push('-'.repeat(40))
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportConversationAsText(
  conversation: Conversation,
  locale: 'ja' | 'en'
): void {
  const text = conversationToText(conversation, { locale })
  const sanitizedTitle = conversation.title.replace(/[/\\?%*:|"<>]/g, '-')
  const filename = `${sanitizedTitle}.txt`
  downloadText(text, filename)
}
