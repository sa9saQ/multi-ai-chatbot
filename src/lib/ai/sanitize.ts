// Prompt injection detection patterns
// Note: Using 'i' flag only (case-insensitive), NOT 'g' flag.
// The 'g' flag causes .test() to update lastIndex, making subsequent calls
// start from that position instead of the beginning - a security vulnerability.
const DANGEROUS_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /disregard\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(all\s+)?previous\s+instructions?/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+if\s+/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /system\s*:\s*/i,
  /\[system\]/i,
  /<\/?system>/i,
]

const MAX_MESSAGE_LENGTH = 50000

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input.trim()

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH)
  }

  sanitized = sanitized
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')

  return sanitized
}

export function containsDangerousPatterns(input: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(input))
}

export function wrapUserInput(input: string): string {
  const sanitized = sanitizeInput(input)
  return `---START USER INPUT---\n${sanitized}\n---END USER INPUT---`
}

export function validateApiKey(apiKey: string | null | undefined): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  const trimmed = apiKey.trim()
  return trimmed.length >= 10 && trimmed.length <= 200
}
