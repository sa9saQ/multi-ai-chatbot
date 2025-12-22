/**
 * Simple in-memory rate limiter for API endpoints
 * 
 * LIMITATIONS:
 * - In-memory storage: Rate limits are not shared across serverless function
 *   instances or during cold starts. This is acceptable for portfolio projects
 *   but production apps should use Redis-based solutions like @upstash/ratelimit.
 * - Header trust: IP extraction prioritizes trusted platform headers (Vercel, 
 *   Cloudflare) but x-forwarded-for can be spoofed in some configurations.
 * 
 * For production, consider:
 * - @upstash/ratelimit with Redis
 * - Vercel's Edge Config rate limiting
 * - Cloudflare Rate Limiting at the edge
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  // Allow process to exit
  cleanupTimer.unref()
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Check rate limit for a given identifier (e.g., IP address)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup()

  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  // If no entry or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Get client IP from request headers
 * 
 * SECURITY NOTE: Header spoofing is possible for untrusted proxies.
 * This implementation prioritizes headers set by trusted platforms:
 * 1. Vercel's x-vercel-forwarded-for (set by Vercel's edge, cannot be spoofed)
 * 2. Cloudflare's cf-connecting-ip (set by Cloudflare, cannot be spoofed)
 * 3. x-real-ip (commonly set by reverse proxies)
 * 4. x-forwarded-for (can be spoofed if not behind trusted proxy)
 * 
 * For production with strict security requirements, consider:
 * - Using Redis-based rate limiting with proper IP extraction
 * - Vercel's built-in rate limiting features
 * - Cloudflare's rate limiting at the edge
 */
export function getClientIp(request: Request): string {
  // Priority 1: Vercel's trusted header (set by Vercel edge, not spoofable)
  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) {
    return vercelIp.split(',')[0].trim()
  }

  // Priority 2: Cloudflare's trusted header (set by Cloudflare edge, not spoofable)
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Priority 3: x-real-ip (commonly set by reverse proxies like nginx)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Priority 4: x-forwarded-for (can be spoofed, lowest priority)
  // Note: This is only reliable when behind a trusted proxy that overwrites it
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // Fallback for local development
  return '127.0.0.1'
}
