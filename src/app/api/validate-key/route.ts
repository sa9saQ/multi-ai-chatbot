import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider } from '@/types/ai'

// Validation timeout in milliseconds
const VALIDATION_TIMEOUT = 10000

// Provider API endpoints for validation (using free /models endpoints)
const PROVIDER_ENDPOINTS: Record<AIProvider, { url: string; headers: (apiKey: string) => HeadersInit }> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
    }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/models',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    headers: (apiKey) => ({
      'x-goog-api-key': apiKey,
    }),
  },
}

interface ValidateKeyRequest {
  provider: AIProvider
  apiKey: string
}

interface ValidateKeyResponse {
  valid: boolean
  error?: string
}

// Basic API key format validation (same as api-key-form.tsx)
const API_KEY_PATTERNS: Record<AIProvider, RegExp | null> = {
  openai: /^sk-[a-zA-Z0-9_-]{20,}$/,
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
  google: null, // Google API keys have varied formats
}

function isValidApiKeyFormat(provider: AIProvider, apiKey: string): boolean {
  const pattern = API_KEY_PATTERNS[provider]
  if (!pattern) return true // Skip validation for providers without known patterns
  return pattern.test(apiKey)
}

function isValidProvider(provider: string): provider is AIProvider {
  return ['openai', 'anthropic', 'google'].includes(provider)
}

async function validateWithProvider(provider: AIProvider, apiKey: string): Promise<ValidateKeyResponse> {
  const config = PROVIDER_ENDPOINTS[provider]

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT)

  try {
    const response = await fetch(config.url, {
      method: 'GET',
      headers: config.headers(apiKey),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Check for successful response (200-299)
    if (response.ok) {
      return { valid: true }
    }

    // Handle specific error codes
    if (response.status === 401) {
      return { valid: false, error: 'invalid_key' }
    }

    if (response.status === 403) {
      return { valid: false, error: 'access_forbidden' }
    }

    if (response.status === 429) {
      return { valid: false, error: 'rate_limit_exceeded' }
    }

    // Other errors (server error, etc.)
    return { valid: false, error: 'validation_failed' }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, error: 'timeout' }
    }

    // Network or other errors
    return { valid: false, error: 'network_error' }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidateKeyResponse>> {
  try {
    const body = await request.json()

    // Runtime type validation
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { valid: false, error: 'invalid_request' },
        { status: 400 }
      )
    }

    const { provider, apiKey } = body as Partial<ValidateKeyRequest>

    // Validate request body
    if (!provider || !apiKey || typeof provider !== 'string' || typeof apiKey !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'missing_parameters' },
        { status: 400 }
      )
    }

    // Validate provider
    if (!isValidProvider(provider)) {
      return NextResponse.json(
        { valid: false, error: 'invalid_provider' },
        { status: 400 }
      )
    }

    // Trim and validate non-empty
    const trimmedKey = apiKey.trim()
    if (!trimmedKey) {
      return NextResponse.json(
        { valid: false, error: 'empty_key' },
        { status: 400 }
      )
    }

    // Validate API key format
    if (!isValidApiKeyFormat(provider, trimmedKey)) {
      return NextResponse.json(
        { valid: false, error: 'invalid_format' },
        { status: 400 }
      )
    }

    // Validate with provider API
    const result = await validateWithProvider(provider, trimmedKey)

    return NextResponse.json(result, { status: result.valid ? 200 : 400 })
  } catch {
    // JSON parse error or other unexpected errors
    return NextResponse.json(
      { valid: false, error: 'invalid_request' },
      { status: 400 }
    )
  }
}
