'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeBlock } from './code-block'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Extract domain from URL for display
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Check if a text node is just a URL (improved regex to handle trailing punctuation)
function isStandaloneUrl(text: string): boolean {
  const trimmed = text.trim()
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Security: Check if display text URL matches href to prevent phishing
// e.g., [https://good.com](https://evil.com) would show good.com but link to evil.com
function urlsMatch(displayText: string, href: string): boolean {
  try {
    const displayUrl = new URL(displayText.trim())
    const hrefUrl = new URL(href)
    // Compare normalized URLs (hostname is case-insensitive, path is case-sensitive)
    return (
      displayUrl.hostname.toLowerCase() === hrefUrl.hostname.toLowerCase() &&
      displayUrl.pathname === hrefUrl.pathname
    )
  } catch {
    return false
  }
}

// Security: Validate URL scheme to prevent XSS via javascript: or data: URLs
// Only allow absolute http/https URLs - relative URLs are rejected for safety
function isSafeUrl(href: string | undefined): boolean {
  if (!href) return false
  try {
    const url = new URL(href, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    // Reject malformed URLs entirely for security
    // Note: This means relative URLs like "/path" won't work, but that's safer
    return false
  }
}

// Security: Explicitly allow only safe markdown elements
// This prevents XSS if rehypeRaw is ever added in the future
// NOTE: img is intentionally excluded - use custom renderer if needed
const ALLOWED_ELEMENTS = [
  'p', 'br', 'strong', 'em', 'del', 'a', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
] as const

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Memoize components to prevent recreation on every render
  const components = React.useMemo(() => ({
    // Code blocks
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
      const match = /language-(\w+)/.exec(className || '')
      const isInline = !match && !String(children).includes('\n')

      if (isInline) {
        return (
          <code
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
            {...props}
          >
            {children}
          </code>
        )
      }

      return (
        <CodeBlock
          language={match ? match[1] : 'text'}
          code={String(children).replace(/\n$/, '')}
        />
      )
    },
    // Pre tags - let CodeBlock handle styling
    pre({ children }: { children?: React.ReactNode }) {
      return <>{children}</>
    },
    // Links - styled as cards for standalone URLs
    // Security: Validate URL scheme to prevent XSS (javascript:, data:, etc.)
    // Security: Only render as card if display URL matches href (phishing prevention)
    a({ href, children }: { href?: string; children?: React.ReactNode }) {
      const childText = String(children)
      const isUrlText = isStandaloneUrl(childText)
      const safeHref = isSafeUrl(href) ? href : '#'

      // Only render as card if:
      // 1. Display text is a URL
      // 2. href is safe
      // 3. Display URL matches href (prevents [https://good.com](https://evil.com) phishing)
      if (isUrlText && href && isSafeUrl(href) && urlsMatch(childText, href)) {
        // Render as a link card
        return (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="not-prose my-1 flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent no-underline"
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-foreground">{getDomain(href)}</span>
          </a>
        )
      }

      // Regular inline link (with XSS protection)
      return (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {children}
        </a>
      )
    },
    // Paragraphs
    p({ children }: { children?: React.ReactNode }) {
      return <p className="mb-2 last:mb-0">{children}</p>
    },
    // Lists
    ul({ children }: { children?: React.ReactNode }) {
      return <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
    },
    ol({ children }: { children?: React.ReactNode }) {
      return <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
    },
    li({ children }: { children?: React.ReactNode }) {
      return <li className="text-slate-900 dark:text-slate-50">{children}</li>
    },
    // Headings
    h1({ children }: { children?: React.ReactNode }) {
      return <h1 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{children}</h1>
    },
    h2({ children }: { children?: React.ReactNode }) {
      return <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{children}</h2>
    },
    h3({ children }: { children?: React.ReactNode }) {
      return <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">{children}</h3>
    },
    // Blockquote
    blockquote({ children }: { children?: React.ReactNode }) {
      return (
        <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground">
          {children}
        </blockquote>
      )
    },
    // Strong/Bold
    strong({ children }: { children?: React.ReactNode }) {
      return <strong className="font-semibold">{children}</strong>
    },
    // Horizontal rule
    hr() {
      return <hr className="my-3 border-muted" />
    },
    // Tables (GFM)
    table({ children }: { children?: React.ReactNode }) {
      return (
        <div className="my-2 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">{children}</table>
        </div>
      )
    },
    thead({ children }: { children?: React.ReactNode }) {
      return <thead className="border-b bg-muted/50">{children}</thead>
    },
    tbody({ children }: { children?: React.ReactNode }) {
      return <tbody className="divide-y">{children}</tbody>
    },
    tr({ children }: { children?: React.ReactNode }) {
      return <tr>{children}</tr>
    },
    th({ children }: { children?: React.ReactNode }) {
      return <th className="px-3 py-2 text-left font-medium">{children}</th>
    },
    td({ children }: { children?: React.ReactNode }) {
      return <td className="px-3 py-2">{children}</td>
    },
  }), [])

  return (
    <div className={cn(
      'prose prose-base dark:prose-invert max-w-none',
      'prose-p:text-slate-900 dark:prose-p:text-slate-50',
      'prose-li:text-slate-900 dark:prose-li:text-slate-50',
      'prose-strong:text-slate-900 dark:prose-strong:text-white',
      'prose-headings:text-slate-900 dark:prose-headings:text-white',
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        // Security: Explicitly allow only safe elements to prevent XSS
        // If rehypeRaw is ever added, this whitelist will still protect against malicious HTML
        allowedElements={[...ALLOWED_ELEMENTS]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
