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

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function conversationToHtml(
  conversation: Conversation,
  options: ExportOptions
): string {
  const { locale } = options

  const labels =
    locale === 'ja'
      ? {
          created: '作成日時',
          updated: '最終更新',
          model: 'AIモデル',
          messages: 'メッセージ数',
        }
      : {
          created: 'Created',
          updated: 'Last Updated',
          model: 'AI Model',
          messages: 'Messages',
        }

  const messagesHtml = conversation.messages
    .map((message) => {
      const roleName = getRoleName(message.role, locale)
      const time = formatMessageTime(message.createdAt, locale)
      const bgColor = message.role === 'user' ? '#f3f4f6' : '#e0f2fe'
      const emoji = message.role === 'user' ? '👤' : '🤖'

      return `
        <div style="margin-bottom: 16px; padding: 12px; background-color: ${bgColor}; border-radius: 8px;">
          <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">
            ${emoji} ${escapeHtml(roleName)} <span style="font-weight: normal; color: #6b7280; font-size: 12px;">(${time})</span>
          </div>
          <div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message.content)}</div>
        </div>
      `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(conversation.title)}</title>
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #1f2937;
        }
        h1 {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .meta {
          background-color: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .meta-row {
          display: flex;
          margin-bottom: 4px;
        }
        .meta-label {
          width: 120px;
          color: #6b7280;
        }
        .meta-value {
          color: #1f2937;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(conversation.title)}</h1>
      <div class="meta">
        <div class="meta-row">
          <span class="meta-label">${labels.created}:</span>
          <span class="meta-value">${formatDate(conversation.createdAt, locale)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">${labels.updated}:</span>
          <span class="meta-value">${formatDate(conversation.updatedAt, locale)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">${labels.model}:</span>
          <span class="meta-value">${getModelName(conversation.modelId)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">${labels.messages}:</span>
          <span class="meta-value">${conversation.messages.length}</span>
        </div>
      </div>
      <div class="messages">
        ${messagesHtml}
      </div>
    </body>
    </html>
  `
}

export function exportConversationAsPdf(
  conversation: Conversation,
  locale: 'ja' | 'en'
): void {
  const html = conversationToHtml(conversation, { locale })

  // Open a new window with the HTML content and trigger print
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    // If popup blocked, fallback to blob download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const sanitizedTitle = conversation.title.replace(/[/\\?%*:|"<>]/g, '-')
    link.download = `${sanitizedTitle}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to load before printing
  printWindow.onload = () => {
    printWindow.print()
  }
}
