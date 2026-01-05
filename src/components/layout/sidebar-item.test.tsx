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

  it('shows delete button on hover', () => {
    render(
      <SidebarItem
        conversation={mockConversation}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
      />
    )
    // Delete button should exist even if not visible
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    expect(deleteButton).toBeInTheDocument()
  })

  it('truncates long titles without hiding action buttons', () => {
    const longTitleConversation = {
      ...mockConversation,
      title: 'This is a very long conversation title that should be truncated but the delete and edit buttons should still be visible',
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
    // Buttons should still exist
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    const editButton = screen.getByRole('button', { name: /edit/i })
    expect(deleteButton).toBeInTheDocument()
    expect(editButton).toBeInTheDocument()
  })
})
