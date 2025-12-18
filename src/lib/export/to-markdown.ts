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

export function conversationToMarkdown(
  conversation: Conversation,
  options: ExportOptions
): string {
  const { locale } = options
  const lines: string[] = []

  // Header
  lines.push(`# ${conversation.title}`)
  lines.push('')

  if (locale === 'ja') {
    lines.push('| 項目 | 値 |')
    lines.push('|------|-----|')
    lines.push(`| 作成日時 | ${formatDate(conversation.createdAt, locale)} |`)
    lines.push(`| 最終更新 | ${formatDate(conversation.updatedAt, locale)} |`)
    lines.push(`| AIモデル | ${getModelName(conversation.modelId)} |`)
    lines.push(`| メッセージ数 | ${conversation.messages.length} |`)
  } else {
    lines.push('| Property | Value |')
    lines.push('|----------|-------|')
    lines.push(`| Created | ${formatDate(conversation.createdAt, locale)} |`)
    lines.push(`| Last Updated | ${formatDate(conversation.updatedAt, locale)} |`)
    lines.push(`| AI Model | ${getModelName(conversation.modelId)} |`)
    lines.push(`| Messages | ${conversation.messages.length} |`)
  }

  lines.push('')
  lines.push('---')
  lines.push('')

  // Messages
  for (const message of conversation.messages) {
    const roleName = getRoleName(message.role, locale)
    const time = formatMessageTime(message.createdAt, locale)
    const emoji = message.role === 'user' ? '👤' : '🤖'

    lines.push(`### ${emoji} ${roleName} _(${time})_`)
    lines.push('')
    lines.push(message.content)
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadMarkdown(content: string, filename: string): void {
  downloadFile(content, filename, 'text/markdown')
}

export function exportConversationAsMarkdown(
  conversation: Conversation,
  locale: 'ja' | 'en'
): void {
  const markdown = conversationToMarkdown(conversation, { locale })
  const filename = `${sanitizeFilename(conversation.title)}.md`
  downloadMarkdown(markdown, filename)
}
