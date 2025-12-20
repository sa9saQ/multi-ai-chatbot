# Implementation Tasks: multi-ai-chatbot

## 概要

本ドキュメントは、差別化AIチャットボットの実装タスクを定義する。各タスクは1-3時間の作業単位に分割されており、要件と設計に基づいて優先順位付けされている。

---

## Task 1: プロジェクト基盤セットアップ (P)

プロジェクトの基盤となる設定、依存関係、ディレクトリ構造を構築する。

**要件**: FR-7.11, NFR-4.1, NFR-4.2

### Sub-tasks

- [x] 1.1 Next.js 15プロジェクトの初期設定（App Router、TypeScript、Tailwind CSS v4）
- [x] 1.2 shadcn/ui初期化と必要コンポーネント追加（button, dialog, dropdown-menu, input, scroll-area, select, sheet, textarea, sonner, tooltip）
- [x] 1.3 ESLint、Prettier設定とコード品質ツール導入
- [x] 1.4 ディレクトリ構造作成（`src/components/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/messages/`, `src/i18n/`）

---

## Task 2: 型定義とAIモデル設定 (P)

アプリケーション全体で使用する型定義とAIモデル定数を作成する。

**要件**: FR-1.3

### Sub-tasks

- [x] 2.1 AI関連型定義作成（`types/ai.ts`: AIProvider, AIModel, AI_MODELS定数）
- [x] 2.2 チャット関連型定義作成（`types/chat.ts`: Message, Conversation, ConversationSummary）
- [x] 2.3 テンプレート関連型定義作成（`types/template.ts`: TemplateCategory, Template）
- [x] 2.4 設定関連型定義作成（`types/settings.ts`: Settings, ProviderApiKeys）

---

## Task 3: i18n（多言語対応）基盤構築 (P)

next-intlを使用した日本語/英語対応の基盤を構築する。

**要件**: FR-7.1, FR-7.2, FR-7.3, FR-7.4, FR-7.5

### Sub-tasks

- [x] 3.1 next-intlインストールと設定（`i18n/request.ts`, `i18n/routing.ts`）
- [x] 3.2 日本語翻訳ファイル作成（`messages/ja.json`）
- [x] 3.3 英語翻訳ファイル作成（`messages/en.json`）
- [x] 3.4 ロケール付きレイアウト作成（`app/[locale]/layout.tsx`）
- [x] 3.5 IntlProvider設定（next-intl組み込み機能を使用）

---

## Task 4: テーマ（ダーク/ライトモード）実装 (P)

next-themesを使用したダークモード/ライトモード切り替え機能を実装する。

**要件**: FR-7.6, FR-7.7, FR-7.8

### Sub-tasks

- [x] 4.1 next-themesインストールとThemeProvider設定（`components/providers/theme-provider.tsx`）
- [x] 4.2 グローバルCSS変数設定（ダーク/ライト用カラー定義）
- [x] 4.3 テーマトグルコンポーネント作成（`components/layout/header.tsx`内）

---

## Task 5: 暗号化ユーティリティ実装 (P)

Web Crypto APIを使用したAPIキー暗号化機能を実装する。

**要件**: FR-8.2, NFR-2.1

### Sub-tasks

- [x] 5.1 暗号化/復号化関数作成（`lib/crypto/encryption.ts`: AES-GCM暗号化）
- [x] 5.2 暗号化キー管理（ブラウザ固有キーの生成・保存）

---

## Task 6: Zustandストア実装

アプリケーションの状態管理ストアを実装する。

**要件**: FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-3.6, FR-3.7, FR-5.3, FR-5.4, FR-5.6, FR-8.4

### Sub-tasks

- [x] 6.1 (P) チャットストア作成（`hooks/use-chat-store.ts`: 会話管理、メッセージ追加、モデル切り替え）
- [x] 6.2 (P) 設定ストア作成（`hooks/use-settings-store.ts`: APIキー管理、言語/テーマ設定）
- [x] 6.3 (P) テンプレートストア作成（`hooks/use-templates-store.ts`: プリセット/カスタムテンプレート管理）
- [x] 6.4 ユーティリティフック作成（`hooks/use-local-storage.ts`, `hooks/use-mounted.ts`）

---

## Task 7: レイアウトコンポーネント実装

アプリケーションの基本レイアウト（ヘッダー、サイドバー、モバイルナビゲーション）を実装する。

**要件**: FR-3.1, FR-7.2, FR-7.6, FR-7.9, FR-7.10, FR-7.11

### Sub-tasks

- [x] 7.1 ヘッダーコンポーネント作成（`components/layout/header.tsx`: ロゴ、言語切替、テーマ切替）
- [x] 7.2 サイドバーコンポーネント作成（`components/layout/sidebar.tsx`: 会話一覧、新規チャットボタン）
- [x] 7.3 サイドバーアイテムコンポーネント作成（`components/layout/sidebar-item.tsx`: 会話選択、削除、タイトル編集）
- [x] 7.4 モバイルナビゲーション作成（`components/layout/mobile-nav.tsx`: Sheet使用のハンバーガーメニュー）
- [x] 7.5 メインページレイアウト統合（`app/[locale]/page.tsx`）

---

## Task 8: AIチャットAPI実装

Vercel AI SDKを使用したストリーミングチャットAPIを実装する。

**要件**: FR-1.2, FR-2.2, NFR-1.1, NFR-1.2, NFR-2.3

### Sub-tasks

- [x] 8.1 AI SDK依存関係インストール（ai, @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google）
- [x] 8.2 入力サニタイズ関数作成（`lib/ai/sanitize.ts`: プロンプトインジェクション対策）
- [x] 8.3 AIプロバイダー設定（`lib/ai/providers.ts`: プロバイダーファクトリ関数）
- [x] 8.4 チャットAPIルート作成（`app/api/chat/route.ts`: Edge Runtime、ストリーミングレスポンス）

---

## Task 9: AIモデル選択UI実装

AIモデル選択・表示機能を実装する。

**要件**: FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5

### Sub-tasks

- [x] 9.1 モデルセレクターコンポーネント作成（`components/chat/model-selector.tsx`: プロバイダー別グループ化、Premiumバッジ）
- [x] 9.2 APIキー未設定モデルの選択不可状態表示
- [x] 9.3 現在選択中モデルの常時表示

---

## Task 10: チャットメッセージ表示実装

メッセージ表示エリアとメッセージコンポーネントを実装する。

**要件**: FR-2.3, FR-2.4, FR-2.6, NFR-1.3

### Sub-tasks

- [x] 10.1 メッセージコンポーネント作成（`components/chat/chat-message.tsx`: ユーザー/AI区別表示、タイムスタンプ）
- [x] 10.2 タイピングインジケーター作成（`components/chat/typing-indicator.tsx`）
- [x] 10.3 仮想化スクロールリスト実装（`components/chat/message-list.tsx`: @tanstack/react-virtual使用）

---

## Task 11: コードブロック表示実装

シンタックスハイライト付きコードブロックとコピー機能を実装する。

**要件**: FR-6.1, FR-6.2, FR-6.3, FR-6.4

### Sub-tasks

- [x] 11.1 コードブロックコンポーネント作成（`components/chat/code-block.tsx`: react-syntax-highlighter使用）
- [x] 11.2 コピーボタンとフィードバック実装（i18n対応:「コピーしました」/ "Copied!"）
- [x] 11.3 動的インポートによる遅延読み込み最適化

---

## Task 12: チャット入力フォーム実装

メッセージ入力フォームとキーボード操作を実装する。

**要件**: FR-2.1, FR-2.5, NFR-3.1

### Sub-tasks

- [x] 12.1 チャット入力コンポーネント作成（`components/chat/chat-input.tsx`: Textarea、送信ボタン）
- [x] 12.2 キーボードハンドリング実装（Enter送信、Shift+Enter改行）
- [x] 12.3 アクセシビリティ属性追加（ARIA labels、role属性）

---

## Task 13: チャットエリア統合実装

useChatフックを使用したチャット機能の統合を実装する。

**要件**: FR-2.2, FR-2.7, FR-3.6

### Sub-tasks

- [x] 13.1 チャットエリアコンポーネント作成（`components/chat/chat-area.tsx`: useChat統合）
- [x] 13.2 ストリーミングレスポンス表示実装
- [x] 13.3 エラーハンドリング実装（i18n対応エラーメッセージ）
- [x] 13.4 会話タイトル自動生成（最初のメッセージから30文字）

---

## Task 14: 会話履歴管理実装

会話の作成、選択、削除、タイトル編集機能を実装する。

**要件**: FR-3.2, FR-3.3, FR-3.5, FR-3.7

### Sub-tasks

- [x] 14.1 新規チャット作成機能実装
- [x] 14.2 会話選択・履歴読み込み機能実装
- [x] 14.3 会話削除機能実装（確認ダイアログ付き、i18n対応）
- [x] 14.4 会話タイトル編集機能実装

---

## Task 15: プロンプトテンプレート実装

プリセットテンプレートとカスタムテンプレート機能を実装する。

**要件**: FR-5.1, FR-5.2, FR-5.3, FR-5.4, FR-5.5

### Sub-tasks

- [x] 15.1 テンプレートリストコンポーネント作成（`components/templates/template-list.tsx`）
- [x] 15.2 テンプレートカードコンポーネント作成（`components/templates/template-card.tsx`: 選択時入力フォーム挿入）
- [x] 15.3 カテゴリー表示コンポーネント作成（`components/templates/template-category.tsx`）
- [x] 15.4 テンプレートエディター作成（`components/templates/template-editor.tsx`: カスタムテンプレート作成・編集・削除）

---

## Task 16: エクスポート機能実装

会話のテキスト/Markdown/PDFエクスポート機能を実装する。

**要件**: FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-4.5

### Sub-tasks

- [x] 16.1 テキストエクスポート関数作成（`lib/export/to-text.ts`）
- [x] 16.2 Markdownエクスポート関数作成（`lib/export/to-markdown.ts`）
- [x] 16.3 PDFエクスポート関数作成（`lib/export/to-pdf.ts`: ブラウザ印刷API）
- [x] 16.4 エクスポートメニューコンポーネント作成（`components/export/export-menu.tsx`）

---

## Task 17: 設定画面実装

APIキー設定とデフォルトモデル設定画面を実装する。

**要件**: FR-8.1, FR-8.3, FR-8.4, NFR-2.2

### Sub-tasks

- [x] 17.1 設定ページ作成（`app/[locale]/settings/page.tsx`）
- [x] 17.2 APIキー入力コンポーネント作成（`components/settings/api-key-input.tsx`: マスク表示）
- [x] 17.3 APIキーフォームコンポーネント作成（`components/settings/api-key-form.tsx`）
- [x] 17.4 デフォルトモデル選択コンポーネント作成（`components/settings/default-model-select.tsx`）

---

## Task 18: APIキー検証API実装

APIキーの有効性を検証するAPIエンドポイントを実装する。

**要件**: FR-8.3

### Sub-tasks

- [x] 18.1 検証APIルート作成（`app/api/validate-key/route.ts`）
- [x] 18.2 各プロバイダーの最小テストリクエスト実装
- [x] 18.3 検証結果UIフィードバック実装

---

## Task 19: アクセシビリティ対応

キーボードナビゲーションとスクリーンリーダー対応を実装する。

**要件**: NFR-3.1, NFR-3.2, NFR-3.3

### Sub-tasks

- [x] 19.1 全インタラクティブ要素のキーボード操作確認・修正
- [x] 19.2 ARIA属性の追加と検証（role, aria-label, aria-current等）
- [x] 19.3 コントラスト比の検証と調整（WCAG 2.1 Level AA準拠）

---

## Task 20: レスポンシブデザイン調整

モバイル/タブレット対応のレスポンシブデザインを調整する。

**要件**: FR-7.9, FR-7.10

### Sub-tasks

- [ ] 20.1 ブレークポイント設定と各コンポーネントのレスポンシブ対応確認
- [ ] 20.2 モバイル表示時のサイドバー折りたたみ動作検証
- [ ] 20.3 タッチ操作の最適化（タップターゲットサイズ、スワイプ操作）

---

## Task 21: パフォーマンス最適化

LCPの改善とスクロールパフォーマンスの最適化を行う。

**要件**: NFR-1.3, NFR-1.4

### Sub-tasks

- [ ] 21.1 コンポーネントの動的インポート最適化
- [ ] 21.2 画像・フォントの最適化（next/font使用）
- [ ] 21.3 大量メッセージでのスクロールパフォーマンス検証（1000メッセージテスト）

---

## Task 22: 統合テストと最終調整

全機能の統合テストと最終調整を行う。

**要件**: NFR-4.1, NFR-4.2

### Sub-tasks

- [ ] 22.1 主要ブラウザでの動作確認（Chrome, Firefox, Safari, Edge）
- [ ] 22.2 モバイルブラウザでの動作確認（iOS Safari, Android Chrome）
- [ ] 22.3 E2Eテストシナリオ作成と実行
- [ ] 22.4 受け入れ基準に基づく最終検証（全FR/NFR要件のチェック）

---

## 要件カバレッジマトリクス

| 要件ID | 対応タスク |
|--------|-----------|
| FR-1.1 | Task 9 |
| FR-1.2 | Task 8, 9 |
| FR-1.3 | Task 2, 9 |
| FR-1.4 | Task 9 |
| FR-1.5 | Task 9 |
| FR-2.1 | Task 12 |
| FR-2.2 | Task 8, 13 |
| FR-2.3 | Task 10 |
| FR-2.4 | Task 10 |
| FR-2.5 | Task 12 |
| FR-2.6 | Task 10 |
| FR-2.7 | Task 13 |
| FR-3.1 | Task 6, 7 |
| FR-3.2 | Task 6, 14 |
| FR-3.3 | Task 6, 14 |
| FR-3.4 | Task 6 |
| FR-3.5 | Task 6, 14 |
| FR-3.6 | Task 6, 13 |
| FR-3.7 | Task 6, 14 |
| FR-4.1 | Task 16 |
| FR-4.2 | Task 16 |
| FR-4.3 | Task 16 |
| FR-4.4 | Task 16 |
| FR-4.5 | Task 16 |
| FR-5.1 | Task 3, 15 |
| FR-5.2 | Task 15 |
| FR-5.3 | Task 6, 15 |
| FR-5.4 | Task 6, 15 |
| FR-5.5 | Task 15 |
| FR-5.6 | Task 6 |
| FR-6.1 | Task 11 |
| FR-6.2 | Task 11 |
| FR-6.3 | Task 11 |
| FR-6.4 | Task 11 |
| FR-7.1 | Task 3 |
| FR-7.2 | Task 3, 7 |
| FR-7.3 | Task 3 |
| FR-7.4 | Task 3, 6 |
| FR-7.5 | Task 3 |
| FR-7.6 | Task 4, 7 |
| FR-7.7 | Task 4 |
| FR-7.8 | Task 4 |
| FR-7.9 | Task 7, 20 |
| FR-7.10 | Task 7, 20 |
| FR-7.11 | Task 1, 7 |
| FR-8.1 | Task 17 |
| FR-8.2 | Task 5 |
| FR-8.3 | Task 17, 18 |
| FR-8.4 | Task 6, 17 |
| NFR-1.1 | Task 8 |
| NFR-1.2 | Task 8 |
| NFR-1.3 | Task 10, 21 |
| NFR-1.4 | Task 21 |
| NFR-2.1 | Task 5 |
| NFR-2.2 | Task 17 |
| NFR-2.3 | Task 8 |
| NFR-2.4 | インフラ（Vercel） |
| NFR-3.1 | Task 12, 19 |
| NFR-3.2 | Task 19 |
| NFR-3.3 | Task 19 |
| NFR-4.1 | Task 1, 22 |
| NFR-4.2 | Task 1, 22 |

---

## 並列実行ガイド

以下のタスクは依存関係がないため並列実行可能:

**Phase 1 (並列可能)**:
- Task 1: プロジェクト基盤セットアップ

**Phase 2 (Task 1完了後、並列可能)**:
- Task 2: 型定義とAIモデル設定
- Task 3: i18n基盤構築
- Task 4: テーマ実装
- Task 5: 暗号化ユーティリティ

**Phase 3 (Phase 2完了後、並列可能)**:
- Task 6.1, 6.2, 6.3: Zustandストア（並列可能）
- Task 7: レイアウトコンポーネント
- Task 8: AIチャットAPI

**Phase 4 (Phase 3完了後)**:
- Task 9-18: 機能実装（一部並列可能）

**Phase 5 (Phase 4完了後)**:
- Task 19-22: 最終調整とテスト

---

*生成日: 2025-12-17*
*総タスク数: 22 メジャータスク, 67 サブタスク*
