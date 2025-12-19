'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, Check, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AIProvider } from '@/types/ai'

interface ApiKeyInputProps {
  provider: AIProvider
  hasExistingKey: boolean
  onSave: (apiKey: string) => Promise<void>
  onRemove: () => void
}

export function ApiKeyInput({ provider, hasExistingKey, onSave, onRemove }: ApiKeyInputProps) {
  const t = useTranslations('settings')
  const [value, setValue] = React.useState('')
  const [showKey, setShowKey] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle')

  // Reset visibility when leaving the page (security)
  React.useEffect(() => {
    return () => {
      setShowKey(false)
    }
  }, [])

  // Clear success status after delay
  React.useEffect(() => {
    if (saveStatus === 'success') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleSave = async () => {
    if (!value.trim()) return

    setIsSaving(true)
    setSaveStatus('idle')
    try {
      await onSave(value.trim())
      setValue('')
      setShowKey(false)
      setSaveStatus('success')
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = () => {
    onRemove()
    setValue('')
    setShowKey(false)
    setSaveStatus('idle')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim() && !isSaving) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          id={`api-key-${provider}`}
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasExistingKey ? t('apiKeyMasked') : t('apiKeyPlaceholder')}
          className={cn(
            'pr-10',
            hasExistingKey && !value && 'text-muted-foreground'
          )}
          aria-label={t('apiKeyAriaLabel', { provider })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowKey(!showKey)}
          aria-label={showKey ? t('hideApiKey') : t('showApiKey')}
        >
          {showKey ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      <Button
        onClick={handleSave}
        disabled={!value.trim() || isSaving}
        size="sm"
        className="min-w-[80px]"
      >
        {isSaving ? (
          <span className="animate-pulse">...</span>
        ) : saveStatus === 'success' ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : saveStatus === 'error' ? (
          <X className="h-4 w-4 text-red-500" />
        ) : (
          t('validate')
        )}
      </Button>

      {hasExistingKey && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label={t('removeApiKey', { provider })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
