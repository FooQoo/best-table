# UoW-3 実装計画: 次のおすすめ質問

> `docs/plans/mvp-cycle-3/UNIT_OF_WORK.md` の UoW-3 を対象にする。
> この計画書は実装前の作業手順を整理するものであり、このファイル作成時点では実装には入らない。

## 現状分析

- 関連ファイル:
  - `app/components/feature/results/results-ai-chat.tsx`
  - `app/routes/api.results.chat.tsx`
  - `app/server/services/results-chat-prompt.ts`
  - `app/mocks/data.ts`
  - `app/utils/scoring.ts`
  - `app/domain/models/restaurant.ts`
- 現状の実装/データ:
  - UoW-1 の mock UI では、初回 FAQ と回答後のおすすめ質問4件を固定文言で表示する想定。
  - UoW-2 で地図コンテキスト AI 相談 API が入る。
  - 相手種別 (`counterpart`) と重視条件 (`priorities`) は `BookingState` にある。
  - 店舗側には `score`, `room`, `quiet`, `prestige`, `service`, `budgetLabel`, `access`, `concerns`, `matchingSummary` がある。
- 前提 UoW からの引き継ぎ事項:
  - UoW-1: 質問候補を表示・クリック送信できる UI。
  - UoW-2: 直前の質問・回答と表示中店舗群を API または UI state で扱える。

## 実装方針

- アプローチ:
  - 初回 FAQ はクライアント側の固定候補として維持する。
  - 回答後のおすすめ質問は、まず deterministic な候補生成関数として実装し、必要なら UoW-2 の AI 応答に含める方式へ拡張できるようにする。
  - 質問候補は常に4件へ正規化する。
  - 空席確定、予約成立、未取得情報を断定させる質問は生成しない。
  - 相手種別と重視条件に応じて、比較・懸念・予算・アクセス・個室などの質問軸を変える。
- 変更するファイル一覧:
  - `app/components/feature/results/results-ai-chat.tsx` — おすすめ質問 state とクリック送信。
  - `app/utils/results-chat-suggestions.ts` — 質問候補生成の純粋関数。
  - `app/utils/results-chat-suggestions.test.ts` — 4件保証、安全文言、文脈反映のテスト。
  - `app/routes/api.results.chat.tsx` または `app/server/services/results-chat-prompt.ts` — サーバー生成にする場合の契約追加。

## Bolt 順序と Red/Green/Verify

### Bolt 3-1: おすすめ質問の契約

Red:
- 回答後のおすすめ質問が常に4件であることを書く。
- 空席確定・予約成立を誘導しないことを書く。

Green:
- 固定候補または AI 生成候補の schema/normalizer を実装する。

Verify:
- `pnpm test`

### Bolt 3-2: 文脈反映

Red:
- 相手種別・重視条件・直前質問に応じて質問候補が変わることを書く。

Green:
- 表示中店舗群、`counterpart`、`priorities`、直前質問/回答をおすすめ質問生成に渡す。

Verify:
- 重要顧客・社内上司など複数条件で質問候補を確認する。

### Bolt 3-3: クリック送信

Red:
- おすすめ質問クリックが次の質問として送信されることをテストする。

Green:
- `ResultsAiChat` の質問候補 UI を API 接続後の状態に合わせて更新する。

Verify:
- `/results` で連続質問の流れを確認する。

## リスク・懸念

- AI 生成候補にすると不安定になりやすい。まずは deterministic な候補生成で安全性とテスト容易性を優先する。
- 「空席ありますか？」のような質問を誘導しない。予約前確認は「何を確認すべきか」に留める。
- 4件固定にするため、候補不足時の fallback を用意する。

## 完了の定義

- 初回 FAQ が表示される。
- 回答後に次のおすすめ質問が4件表示される。
- おすすめ質問クリックで次の質問として送信される。
- 相手種別・重視条件・直前質問に応じて候補が変わる。
- 質問候補が空席確定・予約成立を誘導しない。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
