// Prompt injection detection patterns
// Note: Using 'i' flag only (case-insensitive), NOT 'g' flag.
// The 'g' flag causes .test() to update lastIndex, making subsequent calls
// start from that position instead of the beginning - a security vulnerability.
//
// IMPORTANT: These patterns are intentionally conservative to reduce false positives
// while still catching common injection attempts. Patterns targeting code-like syntax
// (e.g., "system:") require line-start anchoring to avoid matching legitimate code.
const DANGEROUS_PATTERNS = [
  // Instruction override attempts
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /disregard\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(all\s+)?previous\s+instructions?/i,
  // Role manipulation attempts
  /you\s+are\s+now\s+/i,
  /act\s+as\s+if\s+/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  // ChatML-style system prompt injection (must be at line start)
  // This avoids false positives on code like { system: 'production' }
  /^system\s*:/im,
  /^\[system\]/im,
  // XML-style system tags (these are less common in code, so keep broad matching)
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

  // Remove invisible characters that could be used for bypass attacks
  sanitized = sanitized
    .replace(/\u0000/g, '')                     // Null bytes
    .replace(/[\u00AD]/g, '')                   // Soft hyphen
    .replace(/[\u200B-\u200F]/g, '')            // Zero-width chars + LTR/RTL marks
    .replace(/[\u2060-\u2064]/g, '')            // Word joiner + invisible operators
    .replace(/[\uFEFF]/g, '')                   // BOM / zero-width no-break space

  return sanitized
}

export function containsDangerousPatterns(input: string): boolean {
  // Normalize input by removing invisible characters before checking
  // This prevents bypass attacks like "igno\u200Bre all previous instructions"
  // which would not match the pattern but becomes "ignore all previous instructions" after sanitization
  // IMPORTANT: Do NOT remove regular spaces - patterns require whitespace to match (e.g., \s+)
  const normalized = input
    .replace(/\u0000/g, '')                 // Null bytes
    .replace(/[\u00AD]/g, '')               // Soft hyphen
    .replace(/[\u200B-\u200F]/g, '')        // Zero-width chars + LTR/RTL marks
    .replace(/[\u2060-\u2064]/g, '')        // Word joiner + invisible operators
    .replace(/[\uFEFF]/g, '')               // BOM / zero-width no-break space
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(normalized))
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
