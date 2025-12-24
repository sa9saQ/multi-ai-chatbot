'use client'

import * as React from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ChatArea } from '@/components/chat'

export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={() => setMobileNavOpen(true)} showMenuButton />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="desktop-sidebar h-full" />

        <main className="flex flex-1 flex-col overflow-hidden">
          <ChatArea />
        </main>
      </div>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </div>
  )
}
