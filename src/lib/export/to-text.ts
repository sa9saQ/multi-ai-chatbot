import type { Conversation } from '@/types/chat'
import {
  type ExportOptions,
  formatDate,
  formatMessageTime,
  getRoleName,
  getModelName,
  sanitizeFilename,
  downloadFile,
} from './utils'

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
  downloadFile(content, filename, 'text/plain')
}

export function exportConversationAsText(
  conversation: Conversation,
  locale: 'ja' | 'en'
): void {
  const text = conversationToText(conversation, { locale })
  const filename = `${sanitizeFilename(conversation.title)}.txt`
  downloadText(text, filename)
}
