# AGENTS.md

## プロジェクト概要

Best Table は、接待・会食向けのレストラン比較を AI で支援する React Router プロトタイプです。

プロダクトの中心仮説:

- 入口は従来型の MAP/検索体験を維持する。
- AI は検索結果の後段で、比較・要約・説明・不安解消に使う。
- 汎用的なレストラン探索ではなく、納得して予約判断へ進めることを重視する。

プロダクトや UI を変更する前に、必要な `docs/` 配下のファイルを読んでください。

## コンテキスト文書

- `docs/DESIGN.md`: プロダクト仕様、ユーザーフロー、画面設計、文言、比較の振る舞い
- `docs/MODEL.md`: DDD によるドメインモデル定義（ユビキタス言語、境界づけられたコンテキスト、集約・値オブジェクト、固定語彙の定数）
- `docs/ARCHITECTURE.md`: React Router 構成、app 配下のコード配置、状態モデル、Client/Server 境界、AI SDK 実装ルール
- `docs/RELIABILITY.md`: AI の根拠付け、キャッシュ、鮮度、障害時の振る舞い
- `docs/SECURITY.md`: センシティブ入力、プロンプトインジェクション、出力安全性、アクセス境界
- `docs/plans/<cycle>/PLANS.md`: 実装マイルストーン、受け入れ条件、成功指標
- `docs/plans/<cycle>/UNIT_OF_WORK.md`: マイルストーンを分解した Unit of Work（UoW）定義、依存関係、Bolt/TDD サイクル
- サイクル（一連の UoW のまとまり）ごとに `PLANS.md`・`UNIT_OF_WORK.md`・実装計画を `docs/plans/` 配下のフォルダにまとめる。現行サイクルは `docs/STATUS.md` を参照
- `docs/STATUS.md`: 各 UoW の進捗状況（未着手／計画済み／進行中／完了）と現在地。作業を進めたら更新する

## アーキテクチャの前提

- フレームワーク: React Router Framework Mode
- ルーティング: `@react-router/fs-routes` によるファイルベースルーティング
- 主要なルートモジュールは `app/routes/` 配下に置く。
- 共通レイアウトルートは `app/routes/_layout.tsx`。
- 検索・会食条件（`BookingRequest` 相当）は `nuqs` による URL query state として `app/state/booking-query-state.ts` に集約する。比較候補・取得済み店舗などの画面内一時状態のみ Jotai（`app/state/booking-context.tsx`）で管理する。
- モックデータは `app/mocks/`、デザイン/スタイル計算は `app/styles/`、汎用関数は `app/utils/`。

現在のルート対応表:

- `/` -> `app/routes/_layout._index.tsx`
- `/hearing` -> `app/routes/_layout.hearing.tsx`
- `/results` -> `app/routes/_layout.results.tsx`

画面を持たない resource route（`/api/restaurants/search`・`/api/restaurants/search/stream`・`/api/photos/*`・`/api/results/chat`・`/api/results/chat/suggestions`）は `docs/ARCHITECTURE.md` を参照。

## プロダクト上のガードレール

- AI ファーストのレストラン検索チャットにしない。
- 構造化された検索条件は正確に扱う。
- AI の価値は、比較、懸念抽出、説明、質問応答に置く。
- AI 文言は短く、利用可能な根拠に基づいたものにする。
- 判断に重要な懸念は画面上に直接表示し、ホバーだけに隠さない。
- 空席、予約成立、裏付けのない店舗事実を断定しない。

## Gitのルール
- ユーザから指示があった場合のみブランチを作成する

## 言語設定
- 原則日本語で会話する

## 検証

コード変更後は以下を実行します。

```bash
pnpm test
pnpm run typecheck
pnpm build
```

ルーティングや UI フローを変更した場合は、主要ルートを確認します。

- `/`
- `/hearing`
- `/results`（比較サイドパネル、地図コンテキスト AI チャットの開閉を含む）
