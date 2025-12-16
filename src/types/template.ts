export type TemplateCategory = 'coding' | 'writing' | 'translation' | 'analysis' | 'custom'

export interface Template {
  id: string
  category: TemplateCategory
  name: {
    ja: string
    en: string
  }
  prompt: {
    ja: string
    en: string
  }
  isCustom: boolean
  createdAt?: Date
}

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { name: { ja: string; en: string } }> = {
  coding: { name: { ja: 'コーディング', en: 'Coding' } },
  writing: { name: { ja: '文章作成', en: 'Writing' } },
  translation: { name: { ja: '翻訳', en: 'Translation' } },
  analysis: { name: { ja: '分析', en: 'Analysis' } },
  custom: { name: { ja: 'カスタム', en: 'Custom' } },
}

export const PRESET_TEMPLATES: Template[] = [
  {
    id: 'code-review',
    category: 'coding',
    name: { ja: 'コードレビュー', en: 'Code Review' },
    prompt: {
      ja: '以下のコードをレビューして、改善点があれば指摘してください：\n\n',
      en: 'Please review the following code and point out any improvements:\n\n',
    },
    isCustom: false,
  },
  {
    id: 'explain-code',
    category: 'coding',
    name: { ja: 'コード解説', en: 'Explain Code' },
    prompt: {
      ja: '以下のコードが何をしているか、わかりやすく説明してください：\n\n',
      en: 'Please explain what the following code does in simple terms:\n\n',
    },
    isCustom: false,
  },
  {
    id: 'fix-bug',
    category: 'coding',
    name: { ja: 'バグ修正', en: 'Fix Bug' },
    prompt: {
      ja: '以下のコードにバグがあります。問題を特定して修正してください：\n\n',
      en: 'There is a bug in the following code. Please identify and fix it:\n\n',
    },
    isCustom: false,
  },
  {
    id: 'proofread',
    category: 'writing',
    name: { ja: '文章校正', en: 'Proofread' },
    prompt: {
      ja: '以下の文章を校正して、改善案を提示してください：\n\n',
      en: 'Please proofread the following text and suggest improvements:\n\n',
    },
    isCustom: false,
  },
  {
    id: 'summarize',
    category: 'writing',
    name: { ja: '要約', en: 'Summarize' },
    prompt: {
      ja: '以下の内容を簡潔に要約してください：\n\n',
      en: 'Please summarize the following content concisely:\n\n',
    },
    isCustom: false,
  },
  {
    id: 'translate-ja-en',
    category: 'translation',
    name: { ja: '日本語→英語翻訳', en: 'Japanese to English' },
    prompt: {
      ja: '以下の日本語を自然な英語に翻訳してください：\n\n',
      en: 'Please translate the following Japanese to natural English:\n\n',
    },
    isCustom: false,
  },
  {
    id: 'translate-en-ja',
    category: 'translation',
    name: { ja: '英語→日本語翻訳', en: 'English to Japanese' },
    prompt: {
      ja: '以下の英語を自然な日本語に翻訳してください：\n\n',
      en: 'Please translate the following English to natural Japanese:\n\n',
    },
    isCustom: false,
  },
  {
    id: 'analyze',
    category: 'analysis',
    name: { ja: '分析・解説', en: 'Analyze' },
    prompt: {
      ja: '以下の内容を分析して、詳しく解説してください：\n\n',
      en: 'Please analyze and explain the following in detail:\n\n',
    },
    isCustom: false,
  },
]

export function createCustomTemplate(
  name: { ja: string; en: string },
  prompt: { ja: string; en: string }
): Template {
  return {
    id: crypto.randomUUID(),
    category: 'custom',
    name,
    prompt,
    isCustom: true,
    createdAt: new Date(),
  }
}
