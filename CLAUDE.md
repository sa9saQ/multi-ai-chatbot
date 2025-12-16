# Multi-AI Chatbot - Project CLAUDE.md

## Project Overview

差別化AIチャットボット - 複数AIモデル（GPT/Claude/Gemini）切り替え、会話履歴保存・エクスポート、プロンプトテンプレート機能を持つポートフォリオ用チャットアプリ。

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Tailwind CSS 4.x + shadcn/ui
- **AI Integration**: Vercel AI SDK 4.x
- **State Management**: Zustand 5.x
- **i18n**: next-intl 4.x
- **Theme**: next-themes

## Development Rules

- Think in English, respond in Japanese
- TDD: テストファースト開発
- セキュリティ: ユーザー入力は必ずバリデーション
- i18n: すべてのUI文字列は翻訳ファイルから取得

## Project-Specific Lessons

<!-- エラー修正時に自動追記される -->

## Key Files

- `.kiro/specs/multi-ai-chatbot/` - 機能仕様
- `src/app/[locale]/` - i18n対応ルート
- `src/stores/` - Zustand stores
- `messages/` - 翻訳ファイル (ja/en)

## Notes

- ポートフォリオ用途：仕事受注のための差別化
- デフォルトモデル（コスト効率）とプレミアムモデル（最新）の2層構成
