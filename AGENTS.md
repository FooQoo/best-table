# AGENTS.md

## プロジェクト概要

Best Table は、接待・会食向けのレストラン比較を AI で支援する React Router プロトタイプです。

プロダクトの中心仮説:

- 入口は従来型の MAP/検索体験を維持する。
- AI は検索結果の後段で、比較・要約・説明・不安解消に使う。
- 汎用的なレストラン探索ではなく、納得して予約判断へ進めることを重視する。

プロダクトや UI を変更する前に、必要な `docs/` 配下のファイルを読んでください。

## コンテキスト文書

- `docs/PRODUCT_SENSE.md`: プロダクト仮説、ターゲット、提供価値、AI の境界
- `docs/DESIGN.md`: ユーザーフロー、画面設計、文言、比較・共有まとめの振る舞い
- `docs/FRONTEND.md`: 現在の React Router 構成、状態モデル、UI 実装方針
- `docs/PLANS.md`: プロトタイプ範囲と実装マイルストーン
- `docs/QUALITY_SCORE.md`: 接待安全度、評価軸、文脈ごとの重み付け、派生データ
- `docs/RELIABILITY.md`: AI の根拠付け、キャッシュ、鮮度、障害時の振る舞い
- `docs/SECURITY.md`: センシティブ入力、プロンプトインジェクション、出力安全性、アクセス境界

## フロントエンドの前提

- フレームワーク: React Router Framework Mode
- ルーティング: `@react-router/fs-routes` によるファイルベースルーティング
- 主要なルートモジュールは `app/routes/` 配下に置く。
- 共通レイアウトルートは `app/routes/_layout.tsx`。
- 共有の予約/検索状態は `app/lib/booking-context.tsx`。
- モックデータとデザイン定数は `app/lib/data.ts`。

現在のルート対応表:

- `/` -> `app/routes/_layout._index.tsx`
- `/hearing` -> `app/routes/_layout.hearing.tsx`
- `/results` -> `app/routes/_layout.results.tsx`
- `/compare` -> `app/routes/_layout.compare.tsx`

## プロダクト上のガードレール

- AI ファーストのレストラン検索チャットにしない。
- 構造化された検索条件は正確に扱う。
- AI の価値は、比較、懸念抽出、説明、質問応答、共有まとめに置く。
- AI 文言は短く、利用可能な根拠に基づいたものにする。
- 判断に重要な懸念は画面上に直接表示し、ホバーだけに隠さない。
- 空席、予約成立、裏付けのない店舗事実を断定しない。

## 検証

コード変更後は以下を実行します。

```bash
pnpm run typecheck
pnpm build
```

ルーティングや UI フローを変更した場合は、主要ルートを確認します。

- `/`
- `/hearing`
- `/results`
- `/compare`
