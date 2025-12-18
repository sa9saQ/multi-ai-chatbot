import type { Message } from '@/types/chat'
import { AI_MODELS } from '@/types/ai'

export interface ExportOptions {
  locale: 'ja' | 'en'
}

export function formatDate(date: Date, locale: 'ja' | 'en'): string {
  return date.toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMessageTime(date: Date, locale: 'ja' | 'en'): string {
  return date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getRoleName(role: Message['role'], locale: 'ja' | 'en'): string {
  if (locale === 'ja') {
    return role === 'user' ? 'ユーザー' : 'AI'
  }
  return role === 'user' ? 'User' : 'AI'
}

export function getModelName(modelId: string): string {
  const model = AI_MODELS.find((m) => m.id === modelId)
  return model?.name ?? modelId
}

export function sanitizeFilename(title: string): string {
  return title.replace(/[/\\?%*:|"<>]/g, '-')
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
