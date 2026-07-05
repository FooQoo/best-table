# UoW-2 実装計画: 地図コンテキスト AI 相談 API

> `docs/plans/mvp-cycle-3/UNIT_OF_WORK.md` の UoW-2 を対象にする。
> この計画書は実装前の作業手順を整理するものであり、このファイル作成時点では実装には入らない。

## 現状分析

- 関連ファイル:
  - `app/components/feature/results/results-ai-chat.tsx`
  - `app/routes/api.restaurants.search.tsx`
  - `app/server/clients/gemini-evaluation.ts`
  - `app/server/services/restaurant-search-query.ts`
  - `app/domain/models/restaurant.ts`
  - `app/state/booking-context.tsx`
- 現状の実装/データ:
  - UoW-1 の UI は mock 回答で動く想定。
  - `BookingState` には検索条件、相手種別、重視条件、表示中 `restaurants` が保持されている。
  - サーバー側には Gemini 呼び出しの client wrapper と、検索用 prompt/service の前例がある。
  - 単一店舗向け質問 API は廃止対象であり、再利用する場合も「単一店舗」前提を持ち込まない。
- 前提 UoW からの引き継ぎ事項:
  - UoW-1 の `ResultsAiChat` が質問送信 UI と表示中店舗群を受け取る。
  - チャット UI は地図上の表示中店舗群を相談対象にする。

## 実装方針

- アプローチ:
  - resource route `app/routes/api.results.chat.tsx` を追加し、`POST /api/results/chat` を受ける。
  - リクエスト body は `restaurants`, `bookingSummary`, `question` を持つ形にする。
  - `restaurants` は `isRestaurant` で各要素を検証し、件数上限も設ける。
  - 質問文は空文字不可・長さ上限ありにする。
  - prompt builder は `app/server/services/results-chat-prompt.ts` に置き、表示中店舗群とヒアリング条件だけを根拠に回答させる。
  - AI client wrapper は `app/server/clients/` に置き、API key と model id をクライアントへ出さない。
  - UI は mock 回答から API 呼び出しへ切り替え、loading/error/streaming を扱う。
- 変更するファイル一覧:
  - `app/routes/api.results.chat.tsx` — resource route。
  - `app/server/services/results-chat-prompt.ts` — prompt builder。
  - `app/server/services/results-chat-prompt.test.ts` — prompt safety test。
  - `app/server/clients/gemini-results-chat.ts` — AI SDK `streamText` wrapper。
  - `app/components/feature/results/results-ai-chat.tsx` — API 接続、loading/error/stream 表示。
  - `app/components/feature/results/results-ai-chat.test.ts` — 入力/失敗時の純粋ロジックがあれば追加。

## Bolt 順序と Red/Green/Verify

### Bolt 2-1: 入力契約と検証

Red:
- `Restaurant[]`、ヒアリング条件、質問文の正常/異常入力を route または service テストで書く。
- 空配列、空質問、長すぎる質問、不正な `Restaurant` が拒否されることを書く。

Green:
- `/api/results/chat` の action と入力検証を実装する。
- request body の型を route 内または server service で閉じる。

Verify:
- `pnpm test`
- `pnpm run typecheck`

### Bolt 2-2: プロンプトと AI ストリーム

Red:
- prompt が表示中店舗とヒアリング条件だけを含むことを書く。
- 空席・予約成立・未取得口コミ本文・未取得メニュー本文を断定しない指示を含むことを書く。

Green:
- 地図コンテキスト相談用 prompt builder と AI client wrapper を実装する。
- `streamText` のテキストストリームを返す。

Verify:
- mock dependency でストリーム応答を確認する。

### Bolt 2-3: UI 接続と失敗表示

Red:
- API 失敗時にチャット内だけエラーが出て、検索結果・比較操作が残ることをテストまたは確認観点として固定する。

Green:
- `ResultsAiChat` を mock 回答から `/api/results/chat` 呼び出しへ切り替える。
- loading/error 状態を実装する。

Verify:
- `/results` で質問送信、ストリーミング表示、失敗時表示を確認する。

## リスク・懸念

- クライアントから渡す `Restaurant[]` は改ざん可能なので、サーバー側で形状・件数・質問文長を検証する。
- 店舗の生口コミやメニュー本文は保持していない。回答でそれらを根拠として扱わせない。
- 表示中店舗数が多い場合、prompt が長くなりすぎる。必要なら上位件数・比較候補・active store などへ要約する。
- AI 失敗時に `/results` 全体をエラーにしない。チャットパネル内だけで失敗を示す。

## 完了の定義

- `/api/results/chat` が表示中 `Restaurant[]` とヒアリング条件を受け取れる。
- 不正入力が拒否される。
- AI 回答は表示中店舗名を使い、空席・予約成立を断定しない。
- API 失敗時も店舗一覧・地図・比較操作が維持される。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
