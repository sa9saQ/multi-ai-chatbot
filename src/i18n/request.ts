import { getRequestConfig } from 'next-intl/server'
import { routing, locales, type Locale } from './routing'

function isValidLocale(locale: unknown): locale is Locale {
  return typeof locale === 'string' && locales.includes(locale as Locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  const validatedLocale = isValidLocale(locale) ? locale : routing.defaultLocale

  return {
    locale: validatedLocale,
    messages: (await import(`../messages/${validatedLocale}.json`)).default,
  }
})
