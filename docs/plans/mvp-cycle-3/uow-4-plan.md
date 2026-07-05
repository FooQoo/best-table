# UoW-4 実装計画: 単一店舗詳細ページ・質問 API の廃止

> `docs/plans/mvp-cycle-3/UNIT_OF_WORK.md` の UoW-4 を対象にする。
> この計画書は実装前の作業手順を整理するものであり、このファイル作成時点では実装には入らない。

## 現状分析

- 関連ファイル:
  - `app/routes/_layout.stores.$storeId.tsx`
  - `app/routes/api.stores.$storeId.ask.tsx`
  - `app/components/feature/store-detail/store-detail-screen.tsx`
  - `app/components/feature/store-detail/store-ask-panel.tsx`
  - `app/server/clients/gemini-ask.ts`
  - `app/server/services/store-ask-prompt.ts`
  - `app/components/feature/results/store-detail-panel.tsx`
  - `app/components/feature/results/store-list.tsx`
  - `docs/ARCHITECTURE.md`
  - `docs/DESIGN.md`
- 現状の実装/データ:
  - `/results` ではカードクリックで `StoreDetailPanel` を開く設計になっており、ページ遷移せず詳細を確認できる。
  - 旧 `/stores/:storeId` と `/api/stores/:storeId/ask` は、mvp-cycle-3 の方針では廃止対象。
  - 単一店舗 Q&A ではなく、表示中店舗群への地図コンテキスト AI チャットへ集約する。
- 前提 UoW からの引き継ぎ事項:
  - UoW-1 で地図コンテキスト AI チャットの新導線が見える状態になる。

## 実装方針

- アプローチ:
  - 旧 route/API と単一店舗 Q&A 専用コンポーネント・server helper を削除する。
  - `/results` 内の `StoreDetailPanel` は残す。これは「店舗ごとの詳細確認」であり、別 URL の詳細ページではない。
  - `rg` で旧 route/API/component 名の参照が残っていないことを確認する。
  - `docs/ARCHITECTURE.md` の正式ルート一覧・resource route 一覧・検証対象から旧ルートを外す。
  - 過去サイクルの履歴 (`mvp-cycle-1` の計画や `docs/STATUS.md` の完了済み履歴) は履歴として残し、現行仕様の参照だけを更新する。
- 変更するファイル一覧:
  - `app/routes/_layout.stores.$storeId.tsx` — 削除。
  - `app/routes/api.stores.$storeId.ask.tsx` — 削除。
  - `app/components/feature/store-detail/` — 旧詳細ページ・質問 UI を削除。
  - `app/server/clients/gemini-ask.ts` — 単一店舗 Q&A 専用なら削除。
  - `app/server/services/store-ask-prompt.ts` — 単一店舗 Q&A 専用なら削除。
  - `app/server/services/restaurant-search.ts` / test — `/stores/:storeId` 前提コメントを一般化。
  - `app/state/booking-context.tsx` — `/stores/:storeId` 前提コメントを `/results` 内詳細パネルへ更新。
  - `docs/ARCHITECTURE.md` / `docs/DESIGN.md` / `docs/MODEL.md` / `docs/RELIABILITY.md` / `docs/SECURITY.md` — 現行仕様へ同期。

## Bolt 順序と Red/Green/Verify

### Bolt 4-1: 旧 route/API 削除

Red:
- build manifest または route 一覧に `/stores/:storeId` と `/api/stores/:storeId/ask` が存在しないことを確認観点として固定する。

Green:
- `app/routes/_layout.stores.$storeId.tsx` を削除する。
- `app/routes/api.stores.$storeId.ask.tsx` を削除する。
- 単一店舗 Q&A 専用 client/service を削除する。

Verify:
- `pnpm build` の client chunk に旧 route/API が出ないことを確認する。

### Bolt 4-2: 未使用 UI/テスト整理

Red:
- `StoreDetailScreen` / `StoreAskPanel` / `gemini-ask` / `store-ask-prompt` の参照が残らないことを `rg` で確認する。

Green:
- 未使用コンポーネント・テスト・コメントを削除または更新する。
- `StoreDetailPanel` は `/results` 内詳細として残す。

Verify:
- `pnpm test`
- `pnpm run typecheck`

### Bolt 4-3: 仕様書同期

Red:
- 現行仕様書の正式ルート・AI ユースケース・検証対象に旧 `/stores/:storeId` が残らないことを確認する。

Green:
- `docs/DESIGN.md` / `docs/ARCHITECTURE.md` / `docs/MODEL.md` / `docs/RELIABILITY.md` / `docs/SECURITY.md` を地図コンテキスト AI チャット方針へ同期する。

Verify:
- docs grep
- 共通 Verify

## リスク・懸念

- 過去サイクルの履歴には `/stores/:storeId` が残る。これは履歴として正しいため、現行仕様だけを更新する。
- `StoreDetailPanel` と `StoreDetailScreen` は名前が近い。削除対象は別 URL の `StoreDetailScreen` で、`/results` 内の `StoreDetailPanel` は残す。
- 単一店舗 Q&A の削除により、店舗1件に対する深掘り相談は地図コンテキスト AI チャットで代替する。回答が横断相談として成立するよう UoW-2/3 と整合させる。

## 完了の定義

- `/stores/:storeId` と `/api/stores/:storeId/ask` が正式ルート/API から消える。
- 旧単一店舗 Q&A 専用 UI/server helper の参照が残らない。
- `/results` のカードクリックはページ遷移せず、`StoreDetailPanel` を開く。
- 現行仕様書が地図コンテキスト AI チャット方針に同期している。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
