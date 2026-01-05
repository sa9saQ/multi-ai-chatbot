import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from './markdown-renderer'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

describe('MarkdownRenderer', () => {
  it('renders plain text', () => {
    render(<MarkdownRenderer content="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders bold text', () => {
    render(<MarkdownRenderer content="**bold text**" />)
    expect(screen.getByText('bold text')).toBeInTheDocument()
  })

  it('renders links with external icon for standalone URLs', () => {
    render(<MarkdownRenderer content="https://example.com" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders inline links normally', () => {
    render(<MarkdownRenderer content="Check [this link](https://example.com) out" />)
    const link = screen.getByRole('link', { name: 'this link' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders unordered lists', () => {
    render(<MarkdownRenderer content="- Item 1\n- Item 2" />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('renders headings', () => {
    render(<MarkdownRenderer content="## Heading 2" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2')
  })

  it('renders code blocks', () => {
    render(<MarkdownRenderer content="```javascript\nconst x = 1;\n```" />)
    expect(screen.getByText('const x = 1;')).toBeInTheDocument()
  })

  it('renders inline code', () => {
    render(<MarkdownRenderer content="Use `const` keyword" />)
    expect(screen.getByText('const')).toBeInTheDocument()
  })
})
