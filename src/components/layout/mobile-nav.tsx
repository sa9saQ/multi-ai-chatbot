'use client'

import { useTranslations } from 'next-intl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const t = useTranslations('common')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>{t('appName')}</SheetTitle>
        </SheetHeader>
        <Sidebar className="w-full border-none" />
      </SheetContent>
    </Sheet>
  )
}
