'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Settings, ProviderApiKeys, Locale, Theme } from '@/types/settings'
import type { AIProvider } from '@/types/ai'
import { DEFAULT_SETTINGS } from '@/types/settings'
import { encrypt, decrypt, isEncryptionSupported } from '@/lib/crypto/encryption'

interface SettingsState {
  settings: Settings
  encryptedKeys: Record<string, string>
  isHydrated: boolean
}

interface SettingsActions {
  setApiKey: (provider: keyof ProviderApiKeys, apiKey: string) => Promise<void>
  getApiKey: (provider: keyof ProviderApiKeys) => Promise<string | null>
  removeApiKey: (provider: keyof ProviderApiKeys) => void
  hasApiKey: (provider: keyof ProviderApiKeys) => boolean
  setLocale: (locale: Locale) => void
  setTheme: (theme: Theme) => void
  setDefaultModel: (provider: AIProvider, modelId: string) => void
  setHydrated: () => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      encryptedKeys: {},
      isHydrated: false,

      setApiKey: async (provider, apiKey) => {
        if (isEncryptionSupported()) {
          const encrypted = await encrypt(apiKey)
          set((state) => ({
            encryptedKeys: {
              ...state.encryptedKeys,
              [provider]: encrypted,
            },
            settings: {
              ...state.settings,
              apiKeys: {
                ...state.settings.apiKeys,
                [provider]: '***encrypted***',
              },
            },
          }))
        } else {
          set((state) => ({
            settings: {
              ...state.settings,
              apiKeys: {
                ...state.settings.apiKeys,
                [provider]: apiKey,
              },
            },
          }))
        }
      },

      getApiKey: async (provider) => {
        const { encryptedKeys, settings } = get()
        if (isEncryptionSupported() && encryptedKeys[provider]) {
          try {
            const decrypted = await decrypt(encryptedKeys[provider])
            return decrypted
          } catch {
            // Decryption failed (key mismatch or corruption) - clean up stale data
            // This ensures hasApiKey() returns false after failed decryption
            // Use state inside set() callback to avoid race conditions
            set((state) => {
              const newEncryptedKeys = { ...state.encryptedKeys }
              delete newEncryptedKeys[provider]
              return {
                encryptedKeys: newEncryptedKeys,
                settings: {
                  ...state.settings,
                  apiKeys: {
                    ...state.settings.apiKeys,
                    [provider]: undefined,
                  },
                },
              }
            })
            return null
          }
        }
        const key = settings.apiKeys[provider]
        return key === '***encrypted***' ? null : (key ?? null)
      },

      removeApiKey: (provider) => {
        // Use state inside set() callback to avoid race conditions
        set((state) => {
          const newEncryptedKeys = { ...state.encryptedKeys }
          delete newEncryptedKeys[provider]
          const newApiKeys = { ...state.settings.apiKeys }
          delete newApiKeys[provider]
          return {
            encryptedKeys: newEncryptedKeys,
            settings: {
              ...state.settings,
              apiKeys: newApiKeys,
            },
          }
        })
      },

      hasApiKey: (provider) => {
        const { encryptedKeys, settings } = get()
        return !!(encryptedKeys[provider] || settings.apiKeys[provider])
      },

      setLocale: (locale) => {
        set((state) => ({
          settings: {
            ...state.settings,
            locale,
          },
        }))
      },

      setTheme: (theme) => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme,
          },
        }))
      },

      setDefaultModel: (provider, modelId) => {
        set((state) => ({
          settings: {
            ...state.settings,
            defaultProvider: provider,
            defaultModelId: modelId,
          },
        }))
      },

      setHydrated: () => {
        set({ isHydrated: true })
      },
    }),
    {
      name: 'multi-ai-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        encryptedKeys: state.encryptedKeys,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
