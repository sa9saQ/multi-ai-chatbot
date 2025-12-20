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
import { locales, type Locale } from '@/i18n/routing'

// Map locale codes to translation keys
const LOCALE_LABEL_KEYS: Record<Locale, string> = {
  ja: 'languageJa',
  en: 'languageEn',
}

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

  const handleLocaleChange = React.useCallback(
    (newLocale: Locale) => {
      // Use locales constant for type-safe regex pattern
      const localePattern = new RegExp(`^/(${locales.join('|')})(/|$)`)
      const newPathname = pathname.replace(localePattern, `/${newLocale}$2`)
      router.push(newPathname)
    },
    [pathname, router]
  )

  const ThemeIcon = React.useMemo(() => {
    if (!mounted) return <Monitor className="h-4 w-4" />
    if (resolvedTheme === 'dark') return <Moon className="h-4 w-4" />
    return <Sun className="h-4 w-4" />
  }, [mounted, resolvedTheme])

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        {showMenuButton && (
          <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden" onClick={onMenuClick}>
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
            {locales.map((loc) => (
              <DropdownMenuItem
                key={loc}
                onClick={() => handleLocaleChange(loc)}
                aria-current={locale === loc ? 'true' : undefined}
                className={locale === loc ? 'bg-accent' : ''}
              >
                {t(LOCALE_LABEL_KEYS[loc])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              {ThemeIcon}
              <span className="sr-only">{t('theme')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              aria-current={theme === 'light' ? 'true' : undefined}
              className={theme === 'light' ? 'bg-accent' : ''}
            >
              <Sun className="mr-2 h-4 w-4" />
              {t('lightMode')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              aria-current={theme === 'dark' ? 'true' : undefined}
              className={theme === 'dark' ? 'bg-accent' : ''}
            >
              <Moon className="mr-2 h-4 w-4" />
              {t('darkMode')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('system')}
              aria-current={theme === 'system' ? 'true' : undefined}
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
