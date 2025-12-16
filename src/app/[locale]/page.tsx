'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ChatArea } from '@/components/chat'

export default function HomePage() {
  const t = useTranslations('chat')
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={() => setMobileNavOpen(true)} showMenuButton />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden md:flex" onSettingsClick={() => setSettingsOpen(true)} />

        <main className="flex flex-1 flex-col overflow-hidden">
          <ChatArea />
        </main>
      </div>

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        onSettingsClick={() => setSettingsOpen(true)}
      />
    </div>
  )
}
