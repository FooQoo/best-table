# UoW-3 実装計画: 検索結果地図

> `docs/plans/mvp-cycle-2/UNIT_OF_WORK.md` の UoW-3 を対象にする。
> UoW-1 の座標解決と UoW-2 の10件単位リストを前提に、`/results` の MAP を実地図へ置き換える。

## 現状分析

- 関連ファイル:
  - `app/components/feature/results/results-map.tsx`
  - `app/components/feature/results/results-screen.tsx`
  - `app/components/feature/results/store-list.tsx`
  - `app/components/feature/results/store-list.test.tsx`
  - `app/domain/models/restaurant.ts`
  - `package.json`
- 現状の実装/データ:
  - `@vis.gl/react-google-maps` は依存関係に入っている。
  - `ResultsMap` はグリッド背景のモック地図で、`Restaurant.location` があれば簡易投影したマーカーを描く。
  - Google Maps JavaScript API の provider / map / marker 共通部品は未実装。
  - `VITE_GOOGLE_MAPS_BROWSER_KEY` 未設定時のフォールバック方針は未実装。
  - 店舗カードと地図マーカーの active state 連動は未実装。
- 前提 UoW からの引き継ぎ事項:
  - UoW-1 で `Restaurant.location` が埋まりうる。
  - UoW-2 でリストは10件単位に増えるため、地図は追記後の全表示店舗を対象にマーカーを更新する。

## 実装方針

- アプローチ:
  - Google Maps の初期化を `app/components/feature/maps/` などの共通 client component に切り出す。
  - `ResultsMap` は `Restaurant[]` と active store id を受け取り、座標がある店舗だけマーカー表示する。
  - API key 未設定・読み込み失敗時は、一覧/比較を止めずに地図領域だけフォールバック表示にする。
  - active state は `ResultsScreen` が持ち、`StoreList` と `ResultsMap` に渡す。
- 変更するファイル一覧:
  - `app/components/feature/maps/google-map-provider.tsx` または同等の新規ファイル — `APIProvider` とキー未設定フォールバック。
  - `app/components/feature/maps/restaurant-map.tsx` または同等の新規ファイル — 店舗マーカー描画、bounds/center 計算。
  - `app/components/feature/results/results-map.tsx` — モック地図から実地図ラッパーへ置き換え。
  - `app/components/feature/results/results-screen.tsx` — active store state を追加。
  - `app/components/feature/results/store-list.tsx` — hover/focus/click で active store を通知し、active 店舗を視覚強調。
  - `app/components/feature/results/store-list.test.tsx` または新規 map helper test — 座標なし除外、active state のテスト。

## Bolt 順序と Red/Green/Verify

### Bolt 3-1: Google Maps provider と地図フォールバック

Red:
- `VITE_GOOGLE_MAPS_BROWSER_KEY` がない場合、地図部分が未設定表示になり、一覧は表示されることをテストする。
- provider に key が渡る条件をテストし、ブラウザ key を server-only key と混同しないことを固定する。

Green:
- `@vis.gl/react-google-maps` の `APIProvider` / `Map` を共通コンポーネント化する。
- key 未設定・読み込み失敗のフォールバック UI を実装する。

Verify:
- `pnpm test`
- `pnpm run typecheck`

### Bolt 3-2: マーカー表示と範囲調整

Red:
- `location` を持つ店舗だけマーカー対象になり、`location: null` は除外される純粋関数テストを書く。
- 複数店舗の座標から初期 center / bounds が作れることを書く。

Green:
- `ResultsMap` を実地図へ置き換える。
- 店舗群に合わせた初期表示範囲を実装する。

Verify:
- `pnpm dev:mock` でマーカー表示・座標なし除外を確認する。

### Bolt 3-3: カード/マーカー連動

Red:
- マーカークリックで対象店舗のカードが強調されることを書く。
- カード hover/focus/選択で対象マーカーが強調されることを書く。

Green:
- `ResultsScreen` に active store state を追加し、`StoreList` / `ResultsMap` に渡す。
- active marker / active card の視覚状態を追加する。

Verify:
- `/results` でカード/マーカー連動を手動確認する。
- 共通 Verify を実行する。

## リスク・懸念

- Google Maps JavaScript API はブラウザ API key が必要。未設定でも開発・テスト・比較導線が壊れないことを優先する。
- SSR と browser-only library の境界に注意する。地図コンポーネントは client side 前提で、window 依存を上位 route に漏らさない。
- 追加読み込み後に bounds を毎回強制変更するとユーザー操作を奪う可能性がある。初回表示と追加時の挙動を分ける。
- UI テストでは実 Google Maps を描画せず、provider / helper / fallback を中心に検証する。

## 完了の定義

- `/results` 右側に Google Maps JavaScript API の実地図が表示される。
- `Restaurant.location` を持つ店舗だけマーカー表示される。
- 店舗カードとマーカーの対応が分かる。
- 地図 key 未設定・読み込み失敗時も一覧・比較導線が使える。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
