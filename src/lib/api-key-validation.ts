/**
 * Shared API key validation utilities
 * Used by both client (api-key-form.tsx) and server (validate-key/route.ts)
 */

import type { AIProvider } from '@/types/ai'

/**
 * API key format patterns for each provider
 * null means no format validation (varied formats)
 */
export const API_KEY_PATTERNS: Record<AIProvider, RegExp | null> = {
  // OpenAI supports multiple prefixes:
  // - sk-xxx (legacy)
  // - sk-proj-xxx (project keys)
  // - sk-admin-xxx (admin keys)
  // - sk-None-xxx (user keys, non-project)
  // - sk-svcacct-xxx (service account keys)
  openai: /^sk-(?:proj-|admin-|None-|svcacct-)?[a-zA-Z0-9_-]{20,}$/,
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
  google: null, // Google API keys have varied formats
}

/**
 * Validate API key format against provider-specific patterns
 * Returns true if the key matches the expected format or if no pattern is defined
 */
export function isValidApiKeyFormat(provider: AIProvider, apiKey: string): boolean {
  const pattern = API_KEY_PATTERNS[provider]
  if (!pattern) return true // Skip validation for providers without known patterns
  return pattern.test(apiKey)
}

/**
 * Type guard to check if a string is a valid AIProvider
 */
export function isValidProvider(provider: string): provider is AIProvider {
  return ['openai', 'anthropic', 'google'].includes(provider)
}
