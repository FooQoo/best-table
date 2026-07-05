# UoW-1 実装計画: 地図内 AI チャット UI

> `docs/plans/mvp-cycle-3/UNIT_OF_WORK.md` の UoW-1 を対象にする。
> この計画書は実装前の作業手順を整理するものであり、このファイル作成時点では実装には入らない。

## 現状分析

- 関連ファイル:
  - `app/components/feature/results/results-screen.tsx`
  - `app/components/feature/results/results-map.tsx`
  - `app/components/feature/results/store-detail-panel.tsx`
  - `app/components/feature/results/store-list.tsx`
  - `app/components/feature/maps/restaurant-map.tsx`
  - `app/state/booking-context.tsx`
- 現状の実装/データ:
  - `/results` は左に `StoreList`、右に `ResultsMap` を置く左右分割レイアウト。
  - `ResultsMap` は `RestaurantMap` を描画し、地図マーカークリックで対象店舗カードを強調・スクロールする。
  - 店舗カードクリックまたは地図マーカークリックで、`/results` 内の `StoreDetailPanel` が開く。
  - `StoreDetailPanel` は外側クリックで閉じるため、地図上の新しいチャット UI とクリック判定が競合しうる。
- 前提 UoW からの引き継ぎ事項:
  - なし。UoW-1 が後続 UoW の UI 足場になる。
  - mock UI レビューでは、地図右下ボタン、地図右側スライドパネル、1行初期入力、自動高さ調整、`Shift+Enter` 改行を採用済み。

## 実装方針

- アプローチ:
  - `ResultsAiChat` を `app/components/feature/results/` に追加し、`ResultsMap` の地図コンテナ内に重ねる。
  - チャットボタンは地図右下、チャットパネルは地図エリア内の右側からスライド表示する。
  - 初回 FAQ と mock 回答を用意し、UoW-2 で API 接続へ差し替えやすいコンポーネント境界にする。
  - チャット関連要素には識別用属性を付け、`StoreDetailPanel` の外側クリック判定から除外する。
  - 入力欄は `textarea` とし、初期1行、長文・改行で自動高さ調整、通常 `Enter` 送信、`Shift+Enter` 改行にする。
- 変更するファイル一覧:
  - `app/components/feature/results/results-ai-chat.tsx` — 新規チャット UI。
  - `app/components/feature/results/results-ai-chat.test.ts` — mock 回答など純粋関数のテスト。
  - `app/components/feature/results/results-map.tsx` — 地図コンテナにチャット UI を組み込む。
  - `app/components/feature/results/store-detail-panel.tsx` — チャット操作中に詳細パネルを閉じない判定を追加する。

## Bolt 順序と Red/Green/Verify

### Bolt 1-1: チャットボタンと右スライドパネル

Red:
- `/results` の地図領域に AI チャットボタンとパネルが存在し、開閉できることをコンポーネントテストまたは確認観点として固定する。

Green:
- `ResultsAiChat` を追加し、`ResultsMap` に組み込む。
- 地図右下ボタン、右スライドパネル、閉じるボタンを実装する。

Verify:
- `/results` でボタン表示、右側スライド、閉じる操作、店舗一覧を覆わないことを確認する。

### Bolt 1-2: FAQ と入力の基本操作

Red:
- 初回 FAQ が表示され、質問後にユーザー吹き出しと mock 回答が出ることをテストする。

Green:
- 固定 FAQ、mock 回答、送信フォームを実装する。
- 送信後に回答と次のおすすめ質問4件を表示する。

Verify:
- FAQ クリック、自由入力、通常 Enter 送信を確認する。

### Bolt 1-3: 詳細パネルとの競合回避と入力 ergonomics

Red:
- AI チャットボタン・パネルクリックで `StoreDetailPanel` が閉じないこと、`Shift+Enter` 改行と自動高さ調整の確認観点を固定する。

Green:
- `data-results-ai-chat` による外側クリック除外を実装する。
- 1行初期表示、自動高さ調整、`Shift+Enter` 改行を実装する。

Verify:
- 店舗詳細パネルを開いたままチャットを操作し、詳細パネルが維持されることを確認する。

## リスク・懸念

- `StoreDetailPanel` とチャットパネルが同時に開くと、地図上の可視領域が狭くなる。パネル幅と z-index を固定し、店舗一覧を覆わないことを優先する。
- 地図の既存マーカー操作とチャットパネルのクリックが重なる場合、パネル内クリックはチャット操作として扱う。
- UoW-2 で API 接続するため、UoW-1 の mock 回答ロジックは簡単に差し替えられる形にしておく。

## 完了の定義

- 地図右下に AI チャットボタンが表示される。
- チャットパネルが地図右側から開閉できる。
- 初回 FAQ と mock 回答、回答後のおすすめ質問4件が表示される。
- 入力欄は初期1行で、長文・`Shift+Enter` 改行に合わせて高さが伸びる。
- チャット操作中に `StoreDetailPanel` が閉じない。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
