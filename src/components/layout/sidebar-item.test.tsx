import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarItem } from './sidebar-item'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const mockConversation = {
  id: 'test-1',
  title: 'Test Conversation',
  provider: 'openai' as const,
  modelId: 'gpt-4',
  messageCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('SidebarItem', () => {
  it('renders conversation title', () => {
    render(
      <SidebarItem
        conversation={mockConversation}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
      />
    )
    expect(screen.getByText('Test Conversation')).toBeInTheDocument()
  })

  it('renders actions dropdown menu', () => {
    render(
      <SidebarItem
        conversation={mockConversation}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
      />
    )
    // Actions should be accessible via dropdown menu
    const menuTrigger = screen.getByRole('button', { name: /actions/i })
    expect(menuTrigger).toBeInTheDocument()
  })

  it('truncates long titles without hiding actions menu', () => {
    const longTitleConversation = {
      ...mockConversation,
      title: 'This is a very long conversation title that should be truncated but the actions menu should still be visible',
    }
    render(
      <SidebarItem
        conversation={longTitleConversation}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
      />
    )
    // Actions menu should still exist (dropdown trigger with aria-haspopup="menu")
    const actionsMenu = screen.getByRole('button', { name: /^actions$/i })
    expect(actionsMenu).toBeInTheDocument()
  })
})
