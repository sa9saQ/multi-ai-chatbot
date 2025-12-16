---
paths: "app/**/*.{ts,tsx}, pages/**/*.{ts,tsx}"
---

# Next.js Rules

- App Router: サーバーコンポーネントがデフォルト、クライアントは'use client'明示
- Server Actions: 'use server'で定義、フォーム処理に使用
- Metadata: generateMetadata() でSEO最適化
- Image: next/image使用、width/height必須
- Link: next/link使用、prefetch自動
