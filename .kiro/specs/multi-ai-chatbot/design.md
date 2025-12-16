# Technical Design: multi-ai-chatbot

## 概要

本ドキュメントは、差別化AIチャットボットの技術設計を定義する。複数AIモデル（GPT/Claude/Gemini）の切り替え、会話履歴管理、エクスポート機能、プロンプトテンプレート、i18n対応を実現するNext.js 15アプリケーションのアーキテクチャを記述する。

---

## 1. アーキテクチャ概要

### 1.1 システムアーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Header    │  │   Sidebar   │  │  ChatArea   │              │
│  │ (Lang/Theme)│  │ (History)   │  │ (Messages)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                │                      │
│         └────────────────┴────────────────┘                      │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              State Management                  │              │
│  │  (Zustand + React Context + localStorage)     │              │
│  └───────────────────────────────────────────────┘              │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              useChat Hook (AI SDK)             │              │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ /api/chat   │  │/api/validate│  │ /api/export │              │
│  │ (streaming) │  │  (API key)  │  │   (PDF)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Provider SDKs                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   OpenAI    │  │  Anthropic  │  │   Google    │              │
│  │  (GPT-4o)   │  │  (Claude)   │  │  (Gemini)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.x |
| ランタイム | React | 19.x |
| スタイリング | Tailwind CSS | 4.x |
| UIコンポーネント | shadcn/ui | latest |
| AI統合 | Vercel AI SDK | 4.x |
| 状態管理 | Zustand | 5.x |
| i18n | next-intl | 4.x |
| テーマ | next-themes | 0.4.x |
| シンタックスハイライト | react-syntax-highlighter | 15.x |
| PDF生成 | jspdf + html2canvas | 2.5.x / 1.4.x |
| 暗号化 | Web Crypto API | Native |

---

## 2. ディレクトリ構造

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              # ロケール付きレイアウト
│   │   ├── page.tsx                # メインチャットページ
│   │   └── settings/
│   │       └── page.tsx            # 設定ページ
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts            # AIチャットAPI (streaming)
│   │   ├── validate-key/
│   │   │   └── route.ts            # APIキー検証
│   │   └── export/
│   │       └── pdf/
│   │           └── route.ts        # PDF生成API
│   ├── layout.tsx                  # ルートレイアウト
│   └── globals.css                 # グローバルスタイル
├── components/
│   ├── chat/
│   │   ├── chat-area.tsx           # メッセージ表示エリア
│   │   ├── chat-input.tsx          # メッセージ入力フォーム
│   │   ├── chat-message.tsx        # 個別メッセージ表示
│   │   ├── code-block.tsx          # コードブロック表示
│   │   ├── model-selector.tsx      # AIモデル選択UI
│   │   └── typing-indicator.tsx    # 入力中インジケーター
│   ├── layout/
│   │   ├── header.tsx              # ヘッダー (言語/テーマ切替)
│   │   ├── sidebar.tsx             # サイドバー (会話履歴)
│   │   ├── sidebar-item.tsx        # 会話履歴アイテム
│   │   └── mobile-nav.tsx          # モバイルナビゲーション
│   ├── settings/
│   │   ├── api-key-form.tsx        # APIキー設定フォーム
│   │   ├── api-key-input.tsx       # マスク付き入力
│   │   └── default-model-select.tsx # デフォルトモデル設定
│   ├── templates/
│   │   ├── template-list.tsx       # テンプレート一覧
│   │   ├── template-card.tsx       # テンプレートカード
│   │   ├── template-editor.tsx     # カスタムテンプレート編集
│   │   └── template-category.tsx   # カテゴリー表示
│   ├── export/
│   │   ├── export-menu.tsx         # エクスポートメニュー
│   │   └── export-button.tsx       # エクスポートボタン
│   ├── ui/                         # shadcn/ui コンポーネント
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   └── tooltip.tsx
│   └── providers/
│       ├── theme-provider.tsx      # next-themes プロバイダー
│       └── intl-provider.tsx       # next-intl プロバイダー
├── hooks/
│   ├── use-chat-store.ts           # Zustand チャットストア
│   ├── use-settings-store.ts       # Zustand 設定ストア
│   ├── use-templates-store.ts      # Zustand テンプレートストア
│   ├── use-local-storage.ts        # localStorage フック
│   ├── use-encrypted-storage.ts    # 暗号化ストレージフック
│   └── use-mounted.ts              # マウント状態フック
├── lib/
│   ├── ai/
│   │   ├── providers.ts            # AIプロバイダー設定
│   │   ├── models.ts               # モデル定義
│   │   └── sanitize.ts             # 入力サニタイズ
│   ├── crypto/
│   │   └── encryption.ts           # APIキー暗号化
│   ├── export/
│   │   ├── to-text.ts              # テキストエクスポート
│   │   ├── to-markdown.ts          # Markdownエクスポート
│   │   └── to-pdf.ts               # PDFエクスポート
│   ├── storage/
│   │   ├── conversations.ts        # 会話履歴操作
│   │   ├── templates.ts            # テンプレート操作
│   │   └── settings.ts             # 設定操作
│   └── utils/
│       ├── date.ts                 # 日時フォーマット
│       └── string.ts               # 文字列ユーティリティ
├── messages/
│   ├── ja.json                     # 日本語翻訳
│   └── en.json                     # 英語翻訳
├── types/
│   ├── chat.ts                     # チャット関連型
│   ├── ai.ts                       # AI関連型
│   ├── template.ts                 # テンプレート型
│   └── settings.ts                 # 設定型
└── i18n/
    ├── request.ts                  # next-intl リクエスト設定
    └── routing.ts                  # ルーティング設定
```

---

## 3. データモデル

### 3.1 TypeScript型定義

```typescript
// types/ai.ts
export type AIProvider = 'openai' | 'anthropic' | 'google';

export type AIModel = {
  id: string;
  name: string;
  provider: AIProvider;
  tier: 'default' | 'premium';
  contextWindow: number;
  description: {
    ja: string;
    en: string;
  };
};

export const AI_MODELS: AIModel[] = [
  // OpenAI
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openai',
    tier: 'default',
    contextWindow: 128000,
    description: {
      ja: 'コスト効率の良い高性能モデル',
      en: 'Cost-effective high-performance model',
    },
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-5.2',
    provider: 'openai',
    tier: 'premium',
    contextWindow: 128000,
    description: {
      ja: '最新のOpenAIモデル',
      en: 'Latest OpenAI model',
    },
  },
  // Anthropic
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    tier: 'default',
    contextWindow: 200000,
    description: {
      ja: 'バランスの取れた高性能モデル',
      en: 'Balanced high-performance model',
    },
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'premium',
    contextWindow: 200000,
    description: {
      ja: '最高品質のAnthropicモデル',
      en: 'Highest quality Anthropic model',
    },
  },
  // Google
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'default',
    contextWindow: 1000000,
    description: {
      ja: '高速で効率的なGoogleモデル',
      en: 'Fast and efficient Google model',
    },
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    tier: 'premium',
    contextWindow: 2000000,
    description: {
      ja: '最新のGoogleモデル',
      en: 'Latest Google model',
    },
  },
];

// types/chat.ts
export type MessageRole = 'user' | 'assistant';

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  modelId?: string;  // AIレスポンスの場合のみ
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationSummary = {
  id: string;
  title: string;
  modelId: string;
  messageCount: number;
  updatedAt: Date;
};

// types/template.ts
export type TemplateCategory =
  | 'coding'
  | 'writing'
  | 'translation'
  | 'analysis'
  | 'custom';

export type Template = {
  id: string;
  name: {
    ja: string;
    en: string;
  };
  content: {
    ja: string;
    en: string;
  };
  category: TemplateCategory;
  isPreset: boolean;
  createdAt: Date;
};

// types/settings.ts
export type ProviderApiKeys = {
  openai?: string;   // 暗号化済み
  anthropic?: string;
  google?: string;
};

export type Settings = {
  defaultModelId: string;
  language: 'ja' | 'en';
  theme: 'light' | 'dark' | 'system';
  apiKeys: ProviderApiKeys;
};
```

### 3.2 localStorage スキーマ

```typescript
// キー: chatbot:conversations
type StoredConversations = {
  version: 1;
  data: Conversation[];
};

// キー: chatbot:templates
type StoredTemplates = {
  version: 1;
  data: Template[];
};

// キー: chatbot:settings
type StoredSettings = {
  version: 1;
  data: Settings;
};

// キー: chatbot:apikeys (暗号化)
type StoredApiKeys = {
  version: 1;
  data: string;  // 暗号化されたJSON文字列
};
```

---

## 4. コンポーネント設計

### 4.1 コンポーネント階層図

```
RootLayout
├── ThemeProvider (next-themes)
│   └── NextIntlClientProvider
│       └── LocaleLayout
│           └── MainPage
│               ├── Header
│               │   ├── Logo
│               │   ├── LanguageSelector
│               │   └── ThemeToggle
│               ├── Sidebar (Desktop)
│               │   ├── NewChatButton
│               │   ├── ConversationList
│               │   │   └── SidebarItem[]
│               │   └── SettingsLink
│               ├── MobileNav (Sheet)
│               │   └── Sidebar (Mobile)
│               └── ChatArea
│                   ├── ModelSelector
│                   ├── MessageList (ScrollArea)
│                   │   └── ChatMessage[]
│                   │       ├── Avatar
│                   │       ├── MessageContent
│                   │       │   └── CodeBlock[] (条件付き)
│                   │       └── Timestamp
│                   ├── TypingIndicator
│                   ├── TemplateList (Collapsible)
│                   │   └── TemplateCard[]
│                   ├── ChatInput
│                   │   ├── Textarea
│                   │   └── SendButton
│                   └── ExportMenu
│                       └── ExportButton[]
```

### 4.2 主要コンポーネント仕様

#### ChatArea

```typescript
// components/chat/chat-area.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useChatStore } from '@/hooks/use-chat-store';
import { useSettingsStore } from '@/hooks/use-settings-store';

interface ChatAreaProps {
  conversationId: string | null;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const { currentConversation, addMessage, updateConversation } = useChatStore();
  const { settings, getDecryptedApiKey } = useSettingsStore();

  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat({
    api: '/api/chat',
    body: {
      modelId: currentConversation?.modelId ?? settings.defaultModelId,
    },
    headers: async () => {
      const apiKey = await getDecryptedApiKey(/* provider from modelId */);
      return {
        'X-API-Key': apiKey ?? '',
      };
    },
    onFinish: (message) => {
      addMessage({
        id: message.id,
        role: 'assistant',
        content: message.content,
        createdAt: new Date(),
        modelId: currentConversation?.modelId,
      });
    },
    onError: (error) => {
      // エラーハンドリング (i18n対応メッセージ表示)
    },
  });

  // ... コンポーネント実装
}
```

#### CodeBlock

```typescript
// components/chat/code-block.tsx
'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const t = useTranslations('CodeBlock');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted">
        <span className="text-sm text-muted-foreground">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          aria-label={t('copyCode')}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              {t('copied')}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              {t('copy')}
            </>
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={resolvedTheme === 'dark' ? oneDark : oneLight}
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
```

#### ModelSelector

```typescript
// components/chat/model-selector.tsx
'use client';

import { useTranslations } from 'next-intl';
import { AI_MODELS, AIModel, AIProvider } from '@/types/ai';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { useChatStore } from '@/hooks/use-chat-store';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ModelSelector() {
  const t = useTranslations('ModelSelector');
  const locale = useLocale();
  const { settings, hasApiKey } = useSettingsStore();
  const { currentConversation, setModel } = useChatStore();

  const selectedModelId = currentConversation?.modelId ?? settings.defaultModelId;

  const groupedModels = AI_MODELS.reduce<Record<AIProvider, AIModel[]>>(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<AIProvider, AIModel[]>
  );

  const isModelDisabled = (model: AIModel): boolean => {
    return !hasApiKey(model.provider);
  };

  return (
    <Select value={selectedModelId} onValueChange={setModel}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t('selectModel')} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedModels).map(([provider, models]) => (
          <SelectGroup key={provider}>
            <SelectLabel>{t(`providers.${provider}`)}</SelectLabel>
            {models.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                disabled={isModelDisabled(model)}
              >
                <div className="flex items-center gap-2">
                  <span>{model.name}</span>
                  {model.tier === 'premium' && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Premium
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## 5. 状態管理設計

### 5.1 Zustand ストア

```typescript
// hooks/use-chat-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Conversation, Message, ConversationSummary } from '@/types/chat';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;

  // Computed
  currentConversation: Conversation | null;
  conversationSummaries: ConversationSummary[];

  // Actions
  createConversation: (modelId: string) => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  addMessage: (message: Message) => void;
  setModel: (modelId: string) => void;
  clearAllConversations: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      get currentConversation() {
        const { conversations, currentConversationId } = get();
        return conversations.find(c => c.id === currentConversationId) ?? null;
      },

      get conversationSummaries() {
        return get().conversations.map(c => ({
          id: c.id,
          title: c.title,
          modelId: c.modelId,
          messageCount: c.messages.length,
          updatedAt: c.updatedAt,
        }));
      },

      createConversation: (modelId) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const conversation: Conversation = {
          id,
          title: '',  // 最初のメッセージで自動設定
          messages: [],
          modelId,
          createdAt: now,
          updatedAt: now,
        };
        set(state => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: id,
        }));
        return id;
      },

      selectConversation: (id) => {
        set({ currentConversationId: id });
      },

      deleteConversation: (id) => {
        set(state => {
          const newConversations = state.conversations.filter(c => c.id !== id);
          const newCurrentId = state.currentConversationId === id
            ? (newConversations[0]?.id ?? null)
            : state.currentConversationId;
          return {
            conversations: newConversations,
            currentConversationId: newCurrentId,
          };
        });
      },

      updateConversationTitle: (id, title) => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? { ...c, title, updatedAt: new Date() } : c
          ),
        }));
      },

      addMessage: (message) => {
        set(state => {
          const { currentConversationId, conversations } = state;
          if (!currentConversationId) return state;

          return {
            conversations: conversations.map(c => {
              if (c.id !== currentConversationId) return c;

              const newMessages = [...c.messages, message];
              const title = c.title || generateTitle(message.content);

              return {
                ...c,
                messages: newMessages,
                title,
                updatedAt: new Date(),
              };
            }),
          };
        });
      },

      setModel: (modelId) => {
        set(state => {
          const { currentConversationId, conversations } = state;
          if (!currentConversationId) return state;

          return {
            conversations: conversations.map(c =>
              c.id === currentConversationId
                ? { ...c, modelId, updatedAt: new Date() }
                : c
            ),
          };
        });
      },

      clearAllConversations: () => {
        set({ conversations: [], currentConversationId: null });
      },
    }),
    {
      name: 'chatbot:conversations',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

function generateTitle(content: string): string {
  const cleaned = content.replace(/\n/g, ' ').trim();
  return cleaned.length > 30 ? `${cleaned.slice(0, 30)}...` : cleaned;
}
```

### 5.2 設定ストア

```typescript
// hooks/use-settings-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Settings, ProviderApiKeys, AIProvider } from '@/types/settings';
import { encrypt, decrypt } from '@/lib/crypto/encryption';

interface SettingsState {
  settings: Settings;

  // Actions
  setLanguage: (language: 'ja' | 'en') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setDefaultModel: (modelId: string) => void;
  setApiKey: (provider: AIProvider, key: string) => Promise<void>;
  removeApiKey: (provider: AIProvider) => void;

  // Queries
  hasApiKey: (provider: AIProvider) => boolean;
  getDecryptedApiKey: (provider: AIProvider) => Promise<string | null>;
}

const DEFAULT_SETTINGS: Settings = {
  defaultModelId: 'gpt-4o-mini',
  language: 'ja',
  theme: 'system',
  apiKeys: {},
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      setLanguage: (language) => {
        set(state => ({
          settings: { ...state.settings, language },
        }));
      },

      setTheme: (theme) => {
        set(state => ({
          settings: { ...state.settings, theme },
        }));
      },

      setDefaultModel: (modelId) => {
        set(state => ({
          settings: { ...state.settings, defaultModelId: modelId },
        }));
      },

      setApiKey: async (provider, key) => {
        const encrypted = await encrypt(key);
        set(state => ({
          settings: {
            ...state.settings,
            apiKeys: {
              ...state.settings.apiKeys,
              [provider]: encrypted,
            },
          },
        }));
      },

      removeApiKey: (provider) => {
        set(state => {
          const { [provider]: _, ...rest } = state.settings.apiKeys;
          return {
            settings: {
              ...state.settings,
              apiKeys: rest,
            },
          };
        });
      },

      hasApiKey: (provider) => {
        return !!get().settings.apiKeys[provider];
      },

      getDecryptedApiKey: async (provider) => {
        const encrypted = get().settings.apiKeys[provider];
        if (!encrypted) return null;
        return await decrypt(encrypted);
      },
    }),
    {
      name: 'chatbot:settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
```

---

## 6. API設計

### 6.1 チャットAPI

```typescript
// app/api/chat/route.ts
import { streamText, convertToCoreMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AI_MODELS } from '@/types/ai';
import { sanitizeInput } from '@/lib/ai/sanitize';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, modelId } = await req.json();
    const apiKey = req.headers.get('X-API-Key');

    const model = AI_MODELS.find(m => m.id === modelId);
    if (!model) {
      return new Response(
        JSON.stringify({ error: 'Invalid model' }),
        { status: 400 }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401 }
      );
    }

    // 入力サニタイズ (プロンプトインジェクション対策)
    const sanitizedMessages = messages.map((m: { role: string; content: string }) => ({
      ...m,
      content: sanitizeInput(m.content),
    }));

    const provider = createProvider(model.provider, apiKey);
    const aiModel = provider(model.id);

    const result = streamText({
      model: aiModel,
      messages: convertToCoreMessages(sanitizedMessages),
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

function createProvider(provider: string, apiKey: string) {
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey });
    case 'anthropic':
      return createAnthropic({ apiKey });
    case 'google':
      return createGoogleGenerativeAI({ apiKey });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 6.2 APIキー検証API

```typescript
// app/api/validate-key/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AIProvider } from '@/types/ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json() as {
      provider: AIProvider;
      apiKey: string;
    };

    const testModel = getTestModel(provider, apiKey);

    // 最小限のテストリクエスト
    await generateText({
      model: testModel,
      prompt: 'Hi',
      maxTokens: 5,
    });

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Invalid API key' }),
      { status: 200 }
    );
  }
}

function getTestModel(provider: AIProvider, apiKey: string) {
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey })('gpt-4o-mini');
    case 'anthropic':
      return createAnthropic({ apiKey })('claude-3-5-haiku-20241022');
    case 'google':
      return createGoogleGenerativeAI({ apiKey })('gemini-2.0-flash');
  }
}
```

---

## 7. i18n実装

### 7.1 翻訳ファイル構造

```json
// messages/ja.json
{
  "Common": {
    "cancel": "キャンセル",
    "save": "保存",
    "delete": "削除",
    "edit": "編集",
    "confirm": "確認",
    "loading": "読み込み中..."
  },
  "Header": {
    "title": "AI チャットボット",
    "language": "言語",
    "theme": "テーマ"
  },
  "Sidebar": {
    "newChat": "新規チャット",
    "conversations": "会話履歴",
    "settings": "設定",
    "deleteConfirm": "この会話を削除しますか？"
  },
  "Chat": {
    "placeholder": "メッセージを入力...",
    "send": "送信",
    "typing": "入力中...",
    "error": "エラーが発生しました。再試行してください。"
  },
  "ModelSelector": {
    "selectModel": "モデルを選択",
    "providers": {
      "openai": "OpenAI",
      "anthropic": "Anthropic",
      "google": "Google"
    },
    "noApiKey": "APIキーが設定されていません"
  },
  "CodeBlock": {
    "copy": "コピー",
    "copied": "コピーしました",
    "copyCode": "コードをコピー"
  },
  "Export": {
    "title": "エクスポート",
    "text": "テキスト (.txt)",
    "markdown": "Markdown (.md)",
    "pdf": "PDF (.pdf)"
  },
  "Templates": {
    "title": "テンプレート",
    "categories": {
      "coding": "コーディング",
      "writing": "文章作成",
      "translation": "翻訳",
      "analysis": "分析",
      "custom": "カスタム"
    },
    "presets": {
      "codeReview": {
        "name": "コードレビュー",
        "content": "以下のコードをレビューして、改善点を提案してください：\n\n```\n{code}\n```"
      },
      "proofread": {
        "name": "文章校正",
        "content": "以下の文章を校正し、修正案を提示してください：\n\n{text}"
      },
      "translate": {
        "name": "翻訳",
        "content": "以下の文章を{target_language}に翻訳してください：\n\n{text}"
      },
      "summarize": {
        "name": "要約",
        "content": "以下の内容を簡潔に要約してください：\n\n{text}"
      }
    },
    "addCustom": "カスタムテンプレートを追加",
    "editTemplate": "テンプレートを編集",
    "deleteConfirm": "このテンプレートを削除しますか？"
  },
  "Settings": {
    "title": "設定",
    "apiKeys": {
      "title": "APIキー",
      "description": "各AIプロバイダーのAPIキーを設定してください",
      "placeholder": "APIキーを入力",
      "validate": "検証",
      "validating": "検証中...",
      "valid": "有効",
      "invalid": "無効"
    },
    "defaultModel": {
      "title": "デフォルトモデル",
      "description": "新規チャット開始時に使用するモデル"
    }
  }
}
```

```json
// messages/en.json
{
  "Common": {
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "loading": "Loading..."
  },
  "Header": {
    "title": "AI Chatbot",
    "language": "Language",
    "theme": "Theme"
  },
  "Sidebar": {
    "newChat": "New Chat",
    "conversations": "Conversations",
    "settings": "Settings",
    "deleteConfirm": "Delete this conversation?"
  },
  "Chat": {
    "placeholder": "Type a message...",
    "send": "Send",
    "typing": "Typing...",
    "error": "An error occurred. Please try again."
  },
  "ModelSelector": {
    "selectModel": "Select Model",
    "providers": {
      "openai": "OpenAI",
      "anthropic": "Anthropic",
      "google": "Google"
    },
    "noApiKey": "API key not configured"
  },
  "CodeBlock": {
    "copy": "Copy",
    "copied": "Copied!",
    "copyCode": "Copy code"
  },
  "Export": {
    "title": "Export",
    "text": "Text (.txt)",
    "markdown": "Markdown (.md)",
    "pdf": "PDF (.pdf)"
  },
  "Templates": {
    "title": "Templates",
    "categories": {
      "coding": "Coding",
      "writing": "Writing",
      "translation": "Translation",
      "analysis": "Analysis",
      "custom": "Custom"
    },
    "presets": {
      "codeReview": {
        "name": "Code Review",
        "content": "Please review the following code and suggest improvements:\n\n```\n{code}\n```"
      },
      "proofread": {
        "name": "Proofread",
        "content": "Please proofread the following text and provide corrections:\n\n{text}"
      },
      "translate": {
        "name": "Translate",
        "content": "Please translate the following text to {target_language}:\n\n{text}"
      },
      "summarize": {
        "name": "Summarize",
        "content": "Please summarize the following content concisely:\n\n{text}"
      }
    },
    "addCustom": "Add Custom Template",
    "editTemplate": "Edit Template",
    "deleteConfirm": "Delete this template?"
  },
  "Settings": {
    "title": "Settings",
    "apiKeys": {
      "title": "API Keys",
      "description": "Configure API keys for each AI provider",
      "placeholder": "Enter API key",
      "validate": "Validate",
      "validating": "Validating...",
      "valid": "Valid",
      "invalid": "Invalid"
    },
    "defaultModel": {
      "title": "Default Model",
      "description": "Model to use when starting a new chat"
    }
  }
}
```

### 7.2 i18n設定

```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as 'ja' | 'en')) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  localeDetection: true,
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

---

## 8. セキュリティ設計

### 8.1 APIキー暗号化

```typescript
// lib/crypto/encryption.ts

// Web Crypto APIを使用したAES-GCM暗号化
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// ブラウザ固有の暗号化キーを生成（初回のみ）
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem('chatbot:encryption-key');

  if (stored) {
    const keyData = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem('chatbot:encryption-key', base64);

  return key;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // IV + 暗号文を結合してBase64エンコード
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
```

### 8.2 入力サニタイズ

```typescript
// lib/ai/sanitize.ts

/**
 * プロンプトインジェクション対策のための入力サニタイズ
 * システムプロンプトへの干渉を防ぐ
 */
export function sanitizeInput(input: string): string {
  // 危険なパターンを検出・無害化
  const sanitized = input
    // システムロール偽装を防止
    .replace(/\[?(system|assistant)\]?:\s*/gi, '[user]: ')
    // 制御文字を除去
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 過度な空白を正規化
    .replace(/\s{10,}/g, ' '.repeat(5));

  return sanitized;
}

/**
 * ユーザー入力を安全に区切る
 */
export function wrapUserInput(input: string): string {
  return `---START USER INPUT---\n${sanitizeInput(input)}\n---END USER INPUT---`;
}
```

---

## 9. エクスポート実装

### 9.1 テキストエクスポート

```typescript
// lib/export/to-text.ts
import { Conversation } from '@/types/chat';
import { formatDate } from '@/lib/utils/date';

export function exportToText(conversation: Conversation, locale: 'ja' | 'en'): string {
  const labels = {
    ja: { title: 'タイトル', model: 'AIモデル', date: '日時', user: 'ユーザー', assistant: 'AI' },
    en: { title: 'Title', model: 'AI Model', date: 'Date', user: 'User', assistant: 'AI' },
  };
  const l = labels[locale];

  const lines: string[] = [
    `${l.title}: ${conversation.title}`,
    `${l.model}: ${conversation.modelId}`,
    `${l.date}: ${formatDate(conversation.createdAt, locale)}`,
    '',
    '---',
    '',
  ];

  for (const message of conversation.messages) {
    const role = message.role === 'user' ? l.user : l.assistant;
    lines.push(`[${role}] (${formatDate(message.createdAt, locale)})`);
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadText(conversation: Conversation, locale: 'ja' | 'en'): void {
  const content = exportToText(conversation, locale);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${encodeURIComponent(conversation.title)}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}
```

### 9.2 Markdownエクスポート

```typescript
// lib/export/to-markdown.ts
import { Conversation } from '@/types/chat';
import { formatDate } from '@/lib/utils/date';

export function exportToMarkdown(conversation: Conversation, locale: 'ja' | 'en'): string {
  const labels = {
    ja: { model: 'AIモデル', exportedAt: 'エクスポート日時' },
    en: { model: 'AI Model', exportedAt: 'Exported at' },
  };
  const l = labels[locale];

  const lines: string[] = [
    `# ${conversation.title}`,
    '',
    `**${l.model}**: ${conversation.modelId}`,
    `**${l.exportedAt}**: ${formatDate(new Date(), locale)}`,
    '',
    '---',
    '',
  ];

  for (const message of conversation.messages) {
    const icon = message.role === 'user' ? '👤' : '🤖';
    lines.push(`### ${icon} ${message.role === 'user' ? 'User' : 'Assistant'}`);
    lines.push(`*${formatDate(message.createdAt, locale)}*`);
    lines.push('');
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadMarkdown(conversation: Conversation, locale: 'ja' | 'en'): void {
  const content = exportToMarkdown(conversation, locale);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${encodeURIComponent(conversation.title)}.md`;
  a.click();

  URL.revokeObjectURL(url);
}
```

### 9.3 PDFエクスポート

```typescript
// lib/export/to-pdf.ts
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Conversation } from '@/types/chat';

export async function downloadPdf(
  conversation: Conversation,
  containerRef: HTMLElement,
  locale: 'ja' | 'en'
): Promise<void> {
  const canvas = await html2canvas(containerRef, {
    scale: 2,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20; // マージン10mm x 2
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${encodeURIComponent(conversation.title)}.pdf`);
}
```

---

## 10. パフォーマンス最適化

### 10.1 仮想化スクロール

```typescript
// components/chat/message-list.tsx
'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Message } from '@/types/chat';
import { ChatMessage } from './chat-message';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 100, []), // 推定メッセージ高さ
    overscan: 5,
  });

  // 新規メッセージ時に自動スクロール
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, virtualizer]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ChatMessage
              message={messages[virtualRow.index]}
              isLast={virtualRow.index === messages.length - 1}
              isStreaming={isStreaming && virtualRow.index === messages.length - 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 10.2 動的インポート

```typescript
// components/chat/code-block.tsx
import dynamic from 'next/dynamic';

// シンタックスハイライトを遅延読み込み
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  {
    loading: () => <pre className="p-4 bg-muted rounded-lg">Loading...</pre>,
    ssr: false,
  }
);
```

---

## 11. アクセシビリティ

### 11.1 キーボードナビゲーション

```typescript
// components/chat/chat-input.tsx
'use client';

import { useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Enter: 送信、Shift+Enter: 改行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  }, [disabled, value, onSubmit]);

  return (
    <div className="flex gap-2" role="form" aria-label="Chat input">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type a message..."
        className="min-h-[60px] resize-none"
        aria-label="Message input"
      />
      <Button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        Send
      </Button>
    </div>
  );
}
```

### 11.2 ARIA属性

```typescript
// components/layout/sidebar.tsx
export function Sidebar() {
  return (
    <aside
      role="navigation"
      aria-label="Conversation history"
      className="..."
    >
      <nav>
        <ul role="list" aria-label="Conversations">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => selectConversation(conv.id)}
              >
                {conv.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

---

## 12. 要件トレーサビリティマトリクス

| 要件ID | 設計コンポーネント | 実装ファイル |
|--------|------------------|--------------|
| FR-1.1 | ModelSelector | `components/chat/model-selector.tsx` |
| FR-1.2 | useChatStore.setModel | `hooks/use-chat-store.ts` |
| FR-1.3 | AI_MODELS定義 | `types/ai.ts` |
| FR-1.4 | ModelSelector表示 | `components/chat/model-selector.tsx` |
| FR-1.5 | hasApiKey判定 | `hooks/use-settings-store.ts` |
| FR-2.1 | ChatInput | `components/chat/chat-input.tsx` |
| FR-2.2 | useChat + streamText | `components/chat/chat-area.tsx`, `app/api/chat/route.ts` |
| FR-2.3 | ChatMessage | `components/chat/chat-message.tsx` |
| FR-2.4 | TypingIndicator | `components/chat/typing-indicator.tsx` |
| FR-2.5 | handleKeyDown | `components/chat/chat-input.tsx` |
| FR-2.6 | メッセージタイムスタンプ | `components/chat/chat-message.tsx` |
| FR-2.7 | useChat.onError + i18n | `components/chat/chat-area.tsx` |
| FR-3.1 | Sidebar | `components/layout/sidebar.tsx` |
| FR-3.2 | createConversation | `hooks/use-chat-store.ts` |
| FR-3.3 | selectConversation | `hooks/use-chat-store.ts` |
| FR-3.4 | Zustand persist | `hooks/use-chat-store.ts` |
| FR-3.5 | deleteConversation + Dialog | `components/layout/sidebar-item.tsx` |
| FR-3.6 | generateTitle | `hooks/use-chat-store.ts` |
| FR-3.7 | updateConversationTitle | `hooks/use-chat-store.ts` |
| FR-4.1 | downloadText | `lib/export/to-text.ts` |
| FR-4.2 | downloadMarkdown | `lib/export/to-markdown.ts` |
| FR-4.3 | downloadPdf | `lib/export/to-pdf.ts` |
| FR-4.4 | エクスポート関数 | `lib/export/*.ts` |
| FR-4.5 | ExportMenu | `components/export/export-menu.tsx` |
| FR-5.1 | 翻訳ファイル | `messages/*.json` |
| FR-5.2 | TemplateCard.onClick | `components/templates/template-card.tsx` |
| FR-5.3 | TemplateEditor | `components/templates/template-editor.tsx` |
| FR-5.4 | useTemplatesStore | `hooks/use-templates-store.ts` |
| FR-5.5 | TemplateCategory | `components/templates/template-category.tsx` |
| FR-5.6 | Zustand persist | `hooks/use-templates-store.ts` |
| FR-6.1 | CodeBlock + SyntaxHighlighter | `components/chat/code-block.tsx` |
| FR-6.2 | handleCopy | `components/chat/code-block.tsx` |
| FR-6.3 | react-syntax-highlighter | `components/chat/code-block.tsx` |
| FR-6.4 | コピーフィードバック + i18n | `components/chat/code-block.tsx` |
| FR-7.1 | next-intl | `i18n/`, `messages/` |
| FR-7.2 | LanguageSelector | `components/layout/header.tsx` |
| FR-7.3 | NextIntlClientProvider | `components/providers/intl-provider.tsx` |
| FR-7.4 | useSettingsStore.setLanguage | `hooks/use-settings-store.ts` |
| FR-7.5 | localeDetection | `i18n/routing.ts` |
| FR-7.6 | ThemeToggle | `components/layout/header.tsx` |
| FR-7.7 | next-themes + persist | `components/providers/theme-provider.tsx` |
| FR-7.8 | defaultTheme: 'system' | `components/providers/theme-provider.tsx` |
| FR-7.9 | Tailwindレスポンシブ | 全コンポーネント |
| FR-7.10 | MobileNav (Sheet) | `components/layout/mobile-nav.tsx` |
| FR-7.11 | shadcn/ui | `components/ui/` |
| FR-8.1 | ApiKeyForm | `components/settings/api-key-form.tsx` |
| FR-8.2 | encrypt/decrypt | `lib/crypto/encryption.ts` |
| FR-8.3 | validate-key API | `app/api/validate-key/route.ts` |
| FR-8.4 | DefaultModelSelect | `components/settings/default-model-select.tsx` |
| NFR-1.1 | Edge Runtime | `app/api/chat/route.ts` |
| NFR-1.2 | streamText | `app/api/chat/route.ts` |
| NFR-1.3 | @tanstack/react-virtual | `components/chat/message-list.tsx` |
| NFR-1.4 | 動的インポート | 各コンポーネント |
| NFR-2.1 | Web Crypto API | `lib/crypto/encryption.ts` |
| NFR-2.2 | ApiKeyInput マスク | `components/settings/api-key-input.tsx` |
| NFR-2.3 | sanitizeInput | `lib/ai/sanitize.ts` |
| NFR-2.4 | Next.js (HTTPS) | インフラ設定 |
| NFR-3.1 | キーボードハンドラー | 全インタラクティブコンポーネント |
| NFR-3.2 | ARIA属性 | 全コンポーネント |
| NFR-3.3 | Tailwindテーマ | `globals.css` |
| NFR-4.1 | モダンブラウザ対応 | 全体 |
| NFR-4.2 | レスポンシブ対応 | 全体 |

---

## 13. 依存関係

### 13.1 本番依存関係

```json
{
  "dependencies": {
    "ai": "^4.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/google": "^1.0.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-intl": "^4.0.0",
    "next-themes": "^0.4.0",
    "zustand": "^5.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "react-syntax-highlighter": "^15.0.0",
    "jspdf": "^2.5.0",
    "html2canvas": "^1.4.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "class-variance-authority": "^0.7.0"
  }
}
```

### 13.2 shadcn/uiコンポーネント

```bash
npx shadcn@latest add button dialog dropdown-menu input \
  scroll-area select sheet textarea toast tooltip
```

---

## 14. リスクと緩和策

| リスク | 影響度 | 緩和策 |
|--------|--------|--------|
| APIキー漏洩 | 高 | Web Crypto APIによる暗号化、サーバーサイドでの処理 |
| プロンプトインジェクション | 中 | 入力サニタイズ、システムプロンプト分離 |
| localStorage容量超過 | 中 | 古い会話の自動削除、容量監視 |
| ストリーミング中断 | 低 | エラーハンドリング、再試行UI |
| ブラウザ互換性 | 低 | Polyfill、フォールバック実装 |

---

*設計書作成日: 2025-12-17*
*フォーマット: Technical Design Document*
