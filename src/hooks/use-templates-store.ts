'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Template, TemplateCategory } from '@/types/template'
import { PRESET_TEMPLATES } from '@/types/template'

interface TemplatesState {
  templates: Template[]
  customTemplates: Template[]
}

interface TemplatesActions {
  addCustomTemplate: (template: Omit<Template, 'id' | 'isCustom'>) => string
  updateCustomTemplate: (id: string, updates: Partial<Omit<Template, 'id' | 'isCustom'>>) => void
  deleteCustomTemplate: (id: string) => void
  getTemplatesByCategory: (category: TemplateCategory) => Template[]
  getAllTemplates: () => Template[]
  getTemplateById: (id: string) => Template | undefined
}

const generateId = () => crypto.randomUUID()

// Helper to revive Date objects from ISO strings in templates
function reviveTemplateDates(templates: Template[]): Template[] {
  return templates.map((t) => ({
    ...t,
    createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
  }))
}

export const useTemplatesStore = create<TemplatesState & TemplatesActions>()(
  persist(
    (set, get) => ({
      templates: PRESET_TEMPLATES,
      customTemplates: [],

      addCustomTemplate: (template) => {
        const id = generateId()
        const newTemplate: Template = {
          ...template,
          id,
          isCustom: true,
          createdAt: new Date(),
        }
        set((state) => ({
          customTemplates: [...state.customTemplates, newTemplate],
        }))
        return id
      },

      updateCustomTemplate: (id, updates) => {
        set((state) => ({
          customTemplates: state.customTemplates.map((t) => {
            if (t.id !== id) return t
            // Explicitly preserve id and isCustom fields
            const { id: _id, isCustom: _isCustom, ...safeUpdates } = updates as Record<string, unknown>
            void _id
            void _isCustom
            return { ...t, ...safeUpdates }
          }),
        }))
      },

      deleteCustomTemplate: (id) => {
        set((state) => ({
          customTemplates: state.customTemplates.filter((t) => t.id !== id),
        }))
      },

      getTemplatesByCategory: (category) => {
        const { templates, customTemplates } = get()
        return [...templates, ...customTemplates].filter((t) => t.category === category)
      },

      getAllTemplates: () => {
        const { templates, customTemplates } = get()
        return [...templates, ...customTemplates]
      },

      getTemplateById: (id) => {
        const { templates, customTemplates } = get()
        return [...templates, ...customTemplates].find((t) => t.id === id)
      },
    }),
    {
      name: 'multi-ai-templates',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customTemplates: state.customTemplates,
      }),
      // Revive Date objects after rehydration from localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.customTemplates) {
          state.customTemplates = reviveTemplateDates(state.customTemplates)
        }
      },
    }
  )
)
