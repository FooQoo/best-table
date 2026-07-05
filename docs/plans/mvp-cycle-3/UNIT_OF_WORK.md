# Unit of Work 分解（AWS AI-DLC 形式）

`docs/plans/mvp-cycle-3/PLANS.md` のマイルストーンを、AWS AI-DLC（AI-Driven Development Life Cycle）の
Inception フェーズで生成される成果物の形式に合わせて Unit of Work（UoW）へ分解したものです。

構成は AI-DLC の `inception/application-design/` 配下の3成果物に対応しています。

- Unit of Work 定義（責務・スコープ）
- 依存関係マトリクス
- ストーリーマップ（`docs/plans/mvp-cycle-3/PLANS.md` のタスク・受け入れ条件との対応）

各 UoW はさらに Bolt（数時間〜数日の短サイクル）に分解します。

各 Bolt は TDD（Red → Green → Verify）で進めます。テストコードを先に書いて失敗させ（Red）、
それを満たす実装をし（Green）、最後に Quality Gates で検証する（Verify）流れです。

**現在の進捗は [`docs/STATUS.md`](../../STATUS.md) で管理する。** 各 UoW が「未着手／計画済み／進行中／完了」の
どこにいるかは、このファイルではなく `docs/STATUS.md` を正とする。Bolt を1つ進めるごとに
`docs/STATUS.md` の該当行と「現在地」を更新する。

**各 UoW は着手前に必ず実装計画（`docs/plans/mvp-cycle-3/uow-N-plan.md`）を確認する。**
定義・依存関係・Bolt 分解が決まっていても、実際のコードベースの現状を踏まえた計画を読んでから
Red に入ることで、手戻りと見落としを防ぐ。テンプレートは [`docs/plans/TEMPLATE.md`](../TEMPLATE.md)、
各 UoW の計画は本ファイルと同じ [`docs/plans/mvp-cycle-3/`](.) 配下を参照する。

このサイクル（`mvp-cycle-3`）は `docs/plans/mvp-cycle-3/PLANS.md` のマイルストーン1〜4に対応する。
`uow-N-plan.md` はユーザー指示により計画段階で作成済み。実装に入る前に、対象 UoW の計画が最新のコード状態とずれていないか確認する。

| Unit of Work | 実装計画 |
|---|---|
| UoW-1 | [`docs/plans/mvp-cycle-3/uow-1-plan.md`](uow-1-plan.md) |
| UoW-2 | [`docs/plans/mvp-cycle-3/uow-2-plan.md`](uow-2-plan.md) |
| UoW-3 | [`docs/plans/mvp-cycle-3/uow-3-plan.md`](uow-3-plan.md) |
| UoW-4 | [`docs/plans/mvp-cycle-3/uow-4-plan.md`](uow-4-plan.md) |

---

## 1. Unit of Work 定義

### UoW-1: 地図内 AI チャット UI

- **責務**: `/results` の地図右下に AI チャットボタンを置き、地図エリア内の右側からチャットパネルを開閉できる UI を実装する。
- **対象ルート / 領域**: `/results`, `ResultsMap`, `ResultsAiChat`, `StoreDetailPanel`
- **スコープ外**: 実 AI API 接続、サーバー側プロンプト、チャット履歴の永続化、実予約・在庫連携。
- **依存**: なし
- **出力**: 右下チャットボタン、右スライドパネル、初回 FAQ、長文対応入力、店舗詳細パネルと競合しないクリック挙動。
- **元マイルストーン**: マイルストーン1（地図内 AI チャット UI）。

### UoW-2: 地図コンテキスト AI 相談 API

- **責務**: 表示中 `Restaurant[]` とヒアリング条件を入力に、地図上の店舗群について短く根拠付きで回答する resource route とプロンプト境界を実装する。
- **対象ルート / 領域**: `/api/results/chat`, `app/server/clients/`, `app/server/services/`, `ResultsAiChat`, `BookingState`
- **スコープ外**: 新規店舗検索、地図範囲検索、空席確認、予約成立の判定、チャット履歴永続化。
- **依存**: UoW-1
- **出力**: `api.results.chat.tsx`、入力検証、地図コンテキスト相談プロンプト、ストリーミング回答、失敗時のチャット内エラー表示。
- **元マイルストーン**: マイルストーン2（地図コンテキスト AI 相談）。

### UoW-3: 次のおすすめ質問

- **責務**: 初回 FAQ と回答後のおすすめ質問4件を、表示中店舗群・会食文脈・直前の質問に合わせて提示し、クリックで次の質問として送信できるようにする。
- **対象ルート / 領域**: `/results`, `ResultsAiChat`, `/api/results/chat`, prompt/schema utilities
- **スコープ外**: 長期的な会話メモリ、ユーザー別パーソナライズ、同席者共有。
- **依存**: UoW-1, UoW-2
- **出力**: 初回 FAQ、回答後4件のおすすめ質問、予約確定・空席断定へ誘導しない質問候補、安全なクリック送信挙動。
- **元マイルストーン**: マイルストーン3（次のおすすめ質問）。

### UoW-4: 単一店舗詳細ページ・質問 API の廃止

- **責務**: `/stores/:storeId` と `/api/stores/:storeId/ask` を正式に廃止し、店舗ごとの詳細確認は `/results` の `StoreDetailPanel`、AI 相談は地図コンテキスト AI チャットに集約する。
- **対象ルート / 領域**: route files, `app/components/feature/store-detail/`, `app/server/clients/`, `app/server/services/`, docs
- **スコープ外**: `/results` 内の `StoreDetailPanel` 廃止、比較画面の最終候補パネル廃止。
- **依存**: UoW-1
- **出力**: 旧 route/API/専用コンポーネント削除、正式ルート一覧更新、build 出力から旧チャンク消滅、主要ルート確認。
- **元マイルストーン**: マイルストーン4（単一店舗詳細ページ・質問 API の廃止）。

---

## 2. 依存関係マトリクス

| Unit of Work | 依存先 | 並行実行可否 |
|---|---|---|
| UoW-1 地図内 AI チャット UI | なし | 最初に着手。UoW-2/3 の UI 足場。 |
| UoW-2 地図コンテキスト AI 相談 API | UoW-1 | UI 契約確定後に着手。 |
| UoW-3 次のおすすめ質問 | UoW-1, UoW-2 | API の応答形式と UI の配置が決まってから着手。 |
| UoW-4 単一店舗詳細ページ・質問 API の廃止 | UoW-1 | UoW-1 と並行可だが、AI 相談の新導線が見えてから行う。 |

```
UoW-1 ──→ UoW-2 ──→ UoW-3
   └────→ UoW-4
```

---

## 3. ストーリーマップ（PLANS.md 対応表）

| Unit of Work | 対応する `docs/plans/mvp-cycle-3/PLANS.md` の受け入れ条件 |
|---|---|
| UoW-1 | 地図右下に AI チャットボタンが表示される／右側からパネルが出る／店舗一覧を覆わない／FAQ が表示される／チャット操作中も比較追加と比較遷移が使える |
| UoW-2 | FAQ または自由入力から質問できる／表示中店舗名を使って回答する／空席や予約成立を断定しない／失敗しても検索結果と比較操作は消えない／質問文の検証がある |
| UoW-3 | 初回 FAQ が表示される／回答後に次のおすすめ質問が4つ表示される／おすすめ質問クリックで送信される／地図上の店舗群を前提にした内容になっている |
| UoW-4 | `/stores/:storeId` と `/api/stores/:storeId/ask` が正式ルート/API から消える／カードクリックは `/results` 内詳細パネルに留まる／AI 相談は地図チャットに集約される |

---

## 4. Bolt 分解と TDD サイクル（Red → Green → Verify）

各 UoW は 2〜3 Bolt に分解し、Bolt 単位で Red（テスト先行）→ Green（実装）→ Verify（検証）を回す。
ロジックとして切り出せない純粋な UI/文言/操作感は Red 相当を「先に確認観点を書き出す」ことに読み替え、
Verify は手動確認とする。

共通 Verify（全 UoW 共通・`AGENTS.md` 準拠）:
- `pnpm test`
- `pnpm run typecheck`
- `pnpm build`
- ルーティング/UI に影響する UoW では `/`, `/hearing`, `/results`, `/compare` を実機確認する。

### UoW-1: 地図内 AI チャット UI

- Bolt 1-1（チャットボタンと右スライドパネル）
  - Red: `/results` の地図領域に AI チャットボタンとパネルが存在し、開閉できることをコンポーネントテストまたは確認観点として固定する。
  - Green: `ResultsAiChat` を追加し、`ResultsMap` に組み込む。地図右下ボタン、右スライドパネル、閉じるボタンを実装する。
  - Verify: `/results` でボタン表示、右側スライド、閉じる操作、店舗一覧を覆わないことを確認する。
- Bolt 1-2（FAQ と入力の基本操作）
  - Red: 初回 FAQ が表示され、質問後にユーザー吹き出しと mock 回答が出ることをテストする。
  - Green: 固定 FAQ、mock 回答、送信フォームを実装する。
  - Verify: FAQ クリック、自由入力、通常 Enter 送信を確認する。
- Bolt 1-3（詳細パネルとの競合回避と入力 ergonomics）
  - Red: AI チャットボタン・パネルクリックで `StoreDetailPanel` が閉じないこと、`Shift+Enter` 改行と自動高さ調整の確認観点を固定する。
  - Green: `data-results-ai-chat` による外側クリック除外、1行初期表示、自動高さ調整、`Shift+Enter` 改行を実装する。
  - Verify: 店舗詳細パネルを開いたままチャットを操作し、詳細パネルが維持されることを確認する。

### UoW-2: 地図コンテキスト AI 相談 API

- Bolt 2-1（入力契約と検証）
  - Red: `Restaurant[]`、ヒアリング条件、質問文の正常/異常入力を route または service テストで書く。
  - Green: `/api/results/chat` の action と入力検証を実装する。空配列、空質問、長すぎる質問、不正な `Restaurant` は 400 にする。
  - Verify: `pnpm test` + `pnpm run typecheck`。
- Bolt 2-2（プロンプトと AI ストリーム）
  - Red: プロンプトが表示中店舗とヒアリング条件だけを含み、空席・予約成立・未取得口コミ本文を断定しない指示を含むことをテストする。
  - Green: 地図コンテキスト相談用 prompt builder と AI client wrapper を実装し、`streamText` のテキストストリームを返す。
  - Verify: mock dependency でストリーム応答を確認する。
- Bolt 2-3（UI 接続と失敗表示）
  - Red: API 失敗時にチャット内だけエラーが出て、検索結果・比較操作が残ることをテストまたは確認観点として固定する。
  - Green: `ResultsAiChat` を mock 回答から `/api/results/chat` 呼び出しへ切り替え、loading/error 状態を実装する。
  - Verify: `/results` で質問送信、ストリーミング表示、失敗時表示を確認する。

### UoW-3: 次のおすすめ質問

- Bolt 3-1（おすすめ質問の契約）
  - Red: 回答後のおすすめ質問が常に4件で、空席確定・予約成立を誘導しないことをテストする。
  - Green: 固定候補または AI 生成候補の schema/normalizer を実装する。
  - Verify: `pnpm test`。
- Bolt 3-2（文脈反映）
  - Red: 相手種別・重視条件・直前質問に応じて質問候補が変わることをテストする。
  - Green: 表示中店舗群、`counterpart`、`priorities`、直前質問/回答をおすすめ質問生成に渡す。
  - Verify: 重要顧客・社内上司など複数条件で質問候補を確認する。
- Bolt 3-3（クリック送信）
  - Red: おすすめ質問クリックが次の質問として送信されることをテストする。
  - Green: `ResultsAiChat` の質問候補 UI を API 接続後の状態に合わせて更新する。
  - Verify: `/results` で連続質問の流れを確認する。

### UoW-4: 単一店舗詳細ページ・質問 API の廃止

- Bolt 4-1（旧 route/API 削除）
  - Red: build manifest または route 一覧に `/stores/:storeId` と `/api/stores/:storeId/ask` が存在しないことを確認観点として固定する。
  - Green: `app/routes/_layout.stores.$storeId.tsx`、`app/routes/api.stores.$storeId.ask.tsx`、単一店舗 Q&A 専用 client/service を削除する。
  - Verify: `pnpm build` の client chunk に旧 route/API が出ないことを確認する。
- Bolt 4-2（未使用 UI/テスト整理）
  - Red: `StoreDetailScreen` / `StoreAskPanel` / `gemini-ask` / `store-ask-prompt` の参照が残らないことを `rg` で確認する。
  - Green: 未使用コンポーネント・テスト・コメントを削除または更新する。`StoreDetailPanel` は `/results` 内詳細として残す。
  - Verify: `pnpm test` + `pnpm run typecheck`。
- Bolt 4-3（仕様書同期）
  - Red: 現行仕様書の正式ルート・AI ユースケース・検証対象に旧 `/stores/:storeId` が残らないことを確認する。
  - Green: `docs/DESIGN.md` / `docs/ARCHITECTURE.md` / `docs/MODEL.md` / `docs/RELIABILITY.md` / `docs/SECURITY.md` を地図コンテキスト AI チャット方針へ同期する。
  - Verify: docs grep + 共通 Verify。
