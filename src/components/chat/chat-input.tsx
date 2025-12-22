'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Send, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  images?: string[]
  onImagesChange?: (images: string[]) => void
  disabled?: boolean
  supportsVision?: boolean
  className?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  images = [],
  onImagesChange,
  disabled,
  supportsVision = true,
  className,
}: ChatInputProps) {
  const t = useTranslations('chat')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && (value.trim() || images.length > 0)) {
        onSubmit()
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!disabled && (value.trim() || images.length > 0)) {
      onSubmit()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImagesChange) return
    const files = e.target.files
    if (!files) return

    const newImages: string[] = []
    const maxImages = 4
    const maxFileSizeBytes = 10 * 1024 * 1024 // 10MB

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (images.length + newImages.length >= maxImages) break
      if (file.size > maxFileSizeBytes) continue // Skip files over 10MB

      // Convert to base64 with error handling
      try {
        const base64 = await fileToBase64(file)
        newImages.push(base64)
      } catch {
        // Skip files that fail to read (e.g., file deleted during read)
        continue
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages])
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    if (!onImagesChange) return
    const newImages = [...images]
    newImages.splice(index, 1)
    onImagesChange(newImages)
  }

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  const canAddImages = supportsVision && images.length < 4

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-2', className)}>
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative h-16 w-16 overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={image}
                alt={t('attachedImage', { number: index + 1 })}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                disabled={disabled}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm hover:bg-destructive/90 disabled:opacity-50"
                aria-label={t('removeImage', { number: index + 1 })}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Image upload button */}
        {supportsVision && onImagesChange && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={disabled || !canAddImages}
              className="hidden"
              aria-label={t('uploadImage')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || !canAddImages}
              className="h-[60px] w-[60px] shrink-0"
              aria-label={t('addImage')}
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          disabled={disabled}
          className="min-h-[60px] max-h-[200px] resize-none text-base"
          rows={2}
          aria-label={t('placeholder')}
        />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={disabled || (!value.trim() && images.length === 0)}
          aria-label={t('send')}
          className="h-[60px] w-[60px] shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
