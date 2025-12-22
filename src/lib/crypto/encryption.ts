/**
 * Client-side API key obfuscation using AES-GCM
 *
 * SECURITY NOTE: This provides obfuscation, NOT true encryption security.
 * The encryption key is stored in localStorage alongside the encrypted data,
 * which means:
 * - XSS attacks can access both the key and encrypted data
 * - This is defense-in-depth against casual inspection only
 * - For production apps handling sensitive keys, consider:
 *   1. Server-side session storage with HTTP-only cookies
 *   2. Backend proxy that stores API keys securely
 *   3. OAuth-based authentication with provider tokens
 *
 * This implementation prevents:
 * - Casual reading of API keys in DevTools
 * - Automated scraping of plain-text localStorage
 * - Shoulder surfing attacks
 */

const ENCRYPTION_KEY_NAME = 'multi-ai-chat-encryption-key'
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  // Check if we have a stored key
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME)

  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey)
      return await crypto.subtle.importKey('jwk', keyData, { name: ALGORITHM }, true, [
        'encrypt',
        'decrypt',
      ])
    } catch {
      // Key is corrupted (invalid JSON or invalid key data)
      // Remove it and fall through to generate a new one
      // Note: This means any previously encrypted data will be unrecoverable,
      // but use-settings-store already handles this by cleaning up stale encrypted keys
      localStorage.removeItem(ENCRYPTION_KEY_NAME)
      console.warn('Corrupted encryption key detected and removed. Generating new key.')
    }
  }

  // Generate a new key
  const key = await crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ])

  // Store the key
  const exportedKey = await crypto.subtle.exportKey('jwk', key)
  localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey))

  return key
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!isEncryptionSupported()) {
    throw new Error('Web Crypto API is not supported in this environment')
  }

  const key = await getOrCreateEncryptionKey()

  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encode the plaintext
  const encodedText = new TextEncoder().encode(plaintext)

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encodedText)

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  // Return as base64
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encryptedData: string): Promise<string> {
  if (!isEncryptionSupported()) {
    throw new Error('Web Crypto API is not supported in this environment')
  }

  const key = await getOrCreateEncryptionKey()

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

  // Extract IV and ciphertext
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  // Decrypt
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext)

  // Decode and return
  return new TextDecoder().decode(decrypted)
}

export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}
