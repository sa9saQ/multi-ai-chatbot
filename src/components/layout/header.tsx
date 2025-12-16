'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Moon, Sun, Monitor, Languages, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMounted } from '@/hooks/use-mounted'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const t = useTranslations('common')
  const mounted = useMounted()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  const ThemeIcon = () => {
    if (!mounted) return <Monitor className="h-4 w-4" />
    if (resolvedTheme === 'dark') return <Moon className="h-4 w-4" />
    return <Sun className="h-4 w-4" />
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        {showMenuButton && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t('openMenu')}</span>
          </Button>
        )}
        <h1 className="text-lg font-semibold">{t('appName')}</h1>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Languages className="h-4 w-4" />
              <span className="sr-only">{t('language')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleLocaleChange('ja')}
              className={locale === 'ja' ? 'bg-accent' : ''}
            >
              日本語
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLocaleChange('en')}
              className={locale === 'en' ? 'bg-accent' : ''}
            >
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <ThemeIcon />
              <span className="sr-only">{t('theme')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              className={theme === 'light' ? 'bg-accent' : ''}
            >
              <Sun className="mr-2 h-4 w-4" />
              {t('lightMode')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              className={theme === 'dark' ? 'bg-accent' : ''}
            >
              <Moon className="mr-2 h-4 w-4" />
              {t('darkMode')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('system')}
              className={theme === 'system' ? 'bg-accent' : ''}
            >
              <Monitor className="mr-2 h-4 w-4" />
              {t('systemMode')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
