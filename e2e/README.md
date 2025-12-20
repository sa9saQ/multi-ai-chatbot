# E2E テスト実行ガイド

## セットアップ

```bash
# 依存関係インストール（初回のみ）
npm install

# Playwrightブラウザインストール（初回のみ）
npx playwright install
```

## テスト実行方法

### 1. 開発サーバーを起動（別ターミナル）
```bash
npm run dev
```

### 2. テスト実行
```bash
# Chromiumのみ
npm run test:e2e -- --project=chromium

# 全ブラウザ（Chrome, Firefox, Safari, Mobile）
npm run test:e2e

# UIモード（インタラクティブ）
npm run test:e2e:ui

# ブラウザ表示あり
npm run test:e2e:headed
```

### 3. レポート確認
```bash
npx playwright show-report
```

## テストカバレッジ

### FR-1: AIモデル選択・切り替え
- [x] FR-1.1: AIモデルセレクター表示
- [x] FR-1.4: 現在のモデル名表示

### FR-2: チャット機能
- [x] FR-2.1: チャット入力フォーム
- [x] FR-2.1: 送信ボタン
- [x] FR-2.5: Enter/Shift+Enter操作

### FR-3: 会話履歴管理
- [x] FR-3.1: サイドバー表示
- [x] FR-3.2: 新規チャットボタン

### FR-4: エクスポート機能
- [x] FR-4.5: エクスポートメニュー

### FR-5: プロンプトテンプレート
- [x] FR-5.1: テンプレートセクション

### FR-7: UI/UX・多言語対応
- [x] FR-7.1: 日本語UI
- [x] FR-7.2: 言語切り替え
- [x] FR-7.6: ダーク/ライトモード
- [x] FR-7.9: レスポンシブデザイン

### FR-8: 設定機能
- [x] FR-8.1: 設定ページ
- [x] NFR-2.2: APIキーマスク表示

### NFR-3: アクセシビリティ
- [x] NFR-3.1: キーボードナビゲーション
- [x] NFR-3.2: ARIA属性

## ブラウザ互換性テスト

| ブラウザ | デスクトップ | モバイル |
|---------|------------|---------|
| Chrome | ✅ テスト対象 | ✅ テスト対象 |
| Firefox | ✅ テスト対象 | - |
| Safari | ✅ テスト対象 | ✅ テスト対象 |
| Edge | Chromiumベース | - |
