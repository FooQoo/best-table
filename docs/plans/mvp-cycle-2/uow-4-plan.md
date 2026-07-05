# UoW-4 実装計画: 最終候補地図と Google Maps 導線

> `docs/plans/mvp-cycle-2/UNIT_OF_WORK.md` の UoW-4 を対象にする。
> UoW-3 の共通地図部品を使い、`/compare` の最終候補パネルに単店舗地図と Google Maps 導線を入れる。

## 現状分析

- 関連ファイル:
  - `app/components/feature/compare/final-store-panel.tsx`
  - `app/components/feature/compare/compare-screen.tsx`
  - `app/components/feature/compare/compare-screen.test.tsx`
  - `app/components/feature/compare/compare-table.tsx`
  - `app/utils/final-candidate-message.ts`
  - `app/domain/models/restaurant.ts`
- 現状の実装/データ:
  - `FinalStorePanel` は理由・予約前確認事項・連絡先・アクセスを表示する。
  - 現在のボタン文言は「Google Mapで開く」になっており、Google Maps URL 生成も `FinalStorePanel` 内にある。
  - 最終候補地図はグリッド背景のモック表示で、`location` があれば中央にマーカー風の点を出す。
  - Google Maps 実地図の共通部品は UoW-3 で作る想定。
- 前提 UoW からの引き継ぎ事項:
  - UoW-1 で最終候補が `location` / `placeId` / `address` を持ちうる。
  - UoW-3 で実地図共通コンポーネントと key 未設定時フォールバックができている。

## 実装方針

- アプローチ:
  - UoW-3 の共通地図部品を使って、最終候補1件だけを表示する `FinalStoreMap` を実地図化する。
  - `location` がない場合は架空位置を出さず、「地図情報なし」を表示する。
  - Google Maps URL 生成は純粋関数として切り出し、`placeId` 優先、なければ店舗名+住所/エリア検索にする。
  - 既存の「この店舗を選んだ理由」「予約前の確認事項」が地図追加で読みづらくならないよう、パネル内レイアウトを調整する。
- 変更するファイル一覧:
  - `app/components/feature/compare/final-store-panel.tsx` — 実地図部品利用、リンク生成関数の切り出し、レイアウト調整。
  - `app/components/feature/compare/final-store-panel.test.tsx` または `compare-screen.test.tsx` — 地図あり/なし、リンク URL、文言をテスト。
  - `app/components/feature/maps/restaurant-map.tsx` — UoW-3 で作った共通地図部品に単店舗表示オプションが足りなければ拡張する。

## Bolt 順序と Red/Green/Verify

### Bolt 4-1: 最終候補地図

Red:
- `FinalStorePanel` が `location` ありなら単店舗地図を表示することを書く。
- `location` なしなら「地図情報なし」を表示し、架空のマーカーを出さないことを書く。

Green:
- 検索結果地図と同じ地図プリミティブで最終候補地図を実装する。
- key 未設定時は UoW-3 のフォールバックを使う。

Verify:
- `/compare` で最終候補選択→地図表示を確認する。

### Bolt 4-2: Google Maps リンク

Red:
- `placeId` が `places/...` の場合は `place_id` URL を生成する純粋関数テストを書く。
- `placeId` がない場合は店舗名+住所、住所がなければ店舗名+エリアの検索 URL を生成することを書く。

Green:
- `FinalStorePanel` の導線を「Google Mapで開く」に統一する。
- 予約導線は出さない。

Verify:
- `/compare` でリンク URL と文言を確認する。

### Bolt 4-3: 既存説明とのレイアウト整合

Red:
- 理由・予約前確認事項・地図・リンクが同時に表示されても主要テキストが DOM から消えないことを書く。
- mobile 幅でボタン文言が潰れないことは目視観点として固定する。

Green:
- 最終候補パネルのレイアウトを調整する。
- 必要なら地図・連絡先・リンクを縦積みに切り替える responsive class を追加する。

Verify:
- `/compare` の最終候補パネルを desktop/mobile 幅で確認する。
- 共通 Verify を実行する。

## リスク・懸念

- 直リンク `/compare` の失敗は今回許容されているため、最終候補がない状態の復元処理は追加しない。
- `placeId` は `"places/ChIJ..."` 形式と raw place id の両方が混在しうる。URL 生成関数で正規化する。
- 「Google Mapで開く」はユーザー指定文言なので、表記を勝手に「Google Maps」へ変えない。
- 地図領域が大きすぎると理由・確認事項が読みにくくなるため、情報密度を優先する。

## 完了の定義

- 最終候補を選ぶと単店舗地図が表示される。
- `location` なし時は「地図情報なし」を表示し、架空位置を出さない。
- 「Google Mapで開く」から該当店舗を Google Maps で開ける。
- 既存の理由・予約前確認事項の読みやすさを維持する。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
