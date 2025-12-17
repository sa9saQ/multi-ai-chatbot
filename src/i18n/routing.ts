import { defineRouting } from 'next-intl/routing'

export const locales = ['ja', 'en'] as const

export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'ja' satisfies Locale,
})
