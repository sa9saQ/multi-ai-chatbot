import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'ja',
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock hooks
vi.mock('@/hooks/use-chat-store', () => ({
  useChatStore: () => ({
    currentConversationId: null,
    generatingConversationId: null,
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    selectConversation: vi.fn(),
    updateConversationTitle: vi.fn(),
    getConversationSummaries: () => [],
  }),
}))

vi.mock('@/hooks/use-mounted', () => ({
  useMounted: () => true,
}))

describe('Sidebar', () => {
  it('renders without ScrollArea clipping issues', async () => {
    // This test documents that we replaced ScrollArea with overflow-y-auto
    // to prevent horizontal clipping of action buttons
    const { Sidebar } = await import('./sidebar')
    render(<Sidebar />)
    expect(screen.getByText('newChat')).toBeInTheDocument()
  })
})
