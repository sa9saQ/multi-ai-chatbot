'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsClick?: () => void
}

export function MobileNav({ open, onOpenChange, onSettingsClick }: MobileNavProps) {
  const t = useTranslations('common')

  const handleSettingsClick = () => {
    onOpenChange(false)
    onSettingsClick?.()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>{t('appName')}</SheetTitle>
        </SheetHeader>
        <Sidebar
          className="w-full border-none"
          onSettingsClick={handleSettingsClick}
        />
      </SheetContent>
    </Sheet>
  )
}
