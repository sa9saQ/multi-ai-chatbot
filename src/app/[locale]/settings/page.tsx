'use client'

import * as React from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiKeyForm, DefaultModelSelect } from '@/components/settings'
import { useMounted } from '@/hooks/use-mounted'

export default function SettingsPage() {
  const t = useTranslations('settings')
  const locale = useLocale()
  const mounted = useMounted()

  // Show loading state during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}`}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        <ApiKeyForm />
        <DefaultModelSelect />
      </main>
    </div>
  )
}
