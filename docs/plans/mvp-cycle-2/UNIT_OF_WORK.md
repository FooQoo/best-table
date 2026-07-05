# Unit of Work 分解（AWS AI-DLC 形式）

`docs/plans/mvp-cycle-2/PLANS.md` のマイルストーンを、AWS AI-DLC（AI-Driven Development Life Cycle）の
Inception フェーズで生成される成果物の形式に合わせて Unit of Work（UoW）へ分解したものです。

構成は AI-DLC の `inception/application-design/` 配下の3成果物に対応しています。

- Unit of Work 定義（責務・スコープ）
- 依存関係マトリクス
- ストーリーマップ（`docs/plans/mvp-cycle-2/PLANS.md` のタスク・受け入れ条件との対応）

各 UoW はさらに Bolt（数時間〜数日の短サイクル）に分解します。

各 Bolt は TDD（Red → Green → Verify）で進めます。テストコードを先に書いて失敗させ（Red）、
それを満たす実装をし（Green）、最後に Quality Gates で検証する（Verify）流れです。

**現在の進捗は [`docs/STATUS.md`](../../STATUS.md) で管理する。** 各 UoW が「未着手／計画済み／進行中／完了」の
どこにいるかは、このファイルではなく `docs/STATUS.md` を正とする。Bolt を1つ進めるごとに
`docs/STATUS.md` の該当行と「現在地」を更新する。

**各 UoW は着手前に必ず実装計画（`docs/plans/mvp-cycle-2/uow-N-plan.md`）を作成する。**
定義・依存関係・Bolt 分解が決まっていても、実際のコードベースの現状を踏まえた計画を書いてから
Red に入ることで、手戻りと見落としを防ぐ。テンプレートは [`docs/plans/TEMPLATE.md`](../TEMPLATE.md)、
各 UoW の計画は本ファイルと同じ [`docs/plans/mvp-cycle-2/`](.) 配下を参照する。

このサイクル（`mvp-cycle-2`）は `docs/plans/mvp-cycle-2/PLANS.md` のマイルストーン1〜4に対応する。
`uow-N-plan.md` はこの段階では作成せず、各 UoW の着手直前に作成する。

| Unit of Work | 実装計画 |
|---|---|
| UoW-1 | 着手前に `docs/plans/mvp-cycle-2/uow-1-plan.md` を作成 |
| UoW-2 | 着手前に `docs/plans/mvp-cycle-2/uow-2-plan.md` を作成 |
| UoW-3 | 着手前に `docs/plans/mvp-cycle-2/uow-3-plan.md` を作成 |
| UoW-4 | 着手前に `docs/plans/mvp-cycle-2/uow-4-plan.md` を作成 |

---

## 1. Unit of Work 定義

### UoW-1: Places 店舗データ解決と mock mode

- **責務**: `placeId` から座標・住所・代表写真を解決するサーバー側境界を追加し、`MODE=mock` では Gemini / Places を呼ばず同じ形のモック `Restaurant[]` を返せるようにする。
- **対象ルート / 領域**: `/api/restaurants/search`, `app/server/clients/`, `app/server/services/`, `app/mocks/`, `app/domain/models/restaurant.ts`
- **スコープ外**: Google Maps JavaScript API による地図描画、スクロール追加取得 UI、予約・在庫連携。
- **依存**: なし
- **出力**: 10件単位で使える Places 解決境界、`MODE=mock` 分岐、座標・住所・代表写真付きモックデータ、上位 SKU フィールドを取らない FieldMask。
- **元マイルストーン**: マイルストーン1（地図に必要な店舗データ）。

### UoW-2: 10件単位の取得・追加読み込み・スケルトン

- **責務**: `/results` の検索結果取得を初回10件 + 最下部スクロール時の追加10件にし、初回・追加取得中は店舗カード形状のスケルトン UI で待たせる。
- **対象ルート / 領域**: `/results`, `/api/restaurants/search`, `ResultsScreen`, `StoreList`, `booking-context`
- **スコープ外**: 実地図描画、Places の FieldMask 詳細、最終候補パネルの地図。
- **依存**: UoW-1
- **出力**: ページング可能な API 契約、追記型の `Restaurant[]` 状態更新、初回/追加取得スケルトン、追加失敗時の再試行導線。
- **元マイルストーン**: マイルストーン2（10件単位の追加取得）。

### UoW-3: 検索結果地図

- **責務**: `/results` の右側 MAP を Google Maps JavaScript API による実地図へ置き換え、`Restaurant.location` を持つ店舗をマーカー表示し、店舗カードとマーカーを連動する。
- **対象ルート / 領域**: `/results`, `ResultsMap`, `StoreList`, Google Maps client component
- **スコープ外**: Places データ解決、追加取得 API、最終候補パネル。
- **依存**: UoW-1, UoW-2
- **出力**: 実地図表示、マーカー表示、地図読み込み失敗時のフォールバック、カード/マーカー強調連動。
- **元マイルストーン**: マイルストーン3（検索結果地図）。

### UoW-4: 最終候補地図と Google Maps 導線

- **責務**: `/compare` の `FinalStorePanel` に最終候補の実地図を表示し、予約ボタンではなく Google Maps で店舗を開く導線を提供する。
- **対象ルート / 領域**: `/compare`, `FinalStorePanel`, Google Maps client component
- **スコープ外**: 実予約、外部予約サイト連携、地図からの在庫確認。
- **依存**: UoW-1, UoW-3
- **出力**: 最終候補単体の地図、`location` なし時の「地図情報なし」表示、`placeId` または店舗名検索による Google Maps リンク。
- **元マイルストーン**: マイルストーン4（最終候補地図）。

---

## 2. 依存関係マトリクス

| Unit of Work | 依存先 | 並行実行可否 |
|---|---|---|
| UoW-1 Places 店舗データ解決と mock mode | なし | 最初に着手。後続のデータ前提。 |
| UoW-2 10件単位の取得・追加読み込み・スケルトン | UoW-1 | UoW-3 の前提。単独推奨。 |
| UoW-3 検索結果地図 | UoW-1, UoW-2 | UoW-4 の前提になる共通地図部品を出す。 |
| UoW-4 最終候補地図と Google Maps 導線 | UoW-1, UoW-3 | UoW-3 の共通地図部品後に着手。 |

```
UoW-1 ──→ UoW-2 ──→ UoW-3 ──→ UoW-4
   └──────────────────────────────↑
```

---

## 3. ストーリーマップ（PLANS.md 対応表）

| Unit of Work | 対応する `docs/plans/mvp-cycle-2/PLANS.md` の受け入れ条件 |
|---|---|
| UoW-1 | `MODE=mock` で座標・住所・代表写真付き店舗が返る／通常 mode で `placeId` から座標・住所・代表写真解決を試みる／上位 SKU フィールドを取らない |
| UoW-2 | 初回最大10件表示／最下部スクロールで追加10件追記／初回・追加取得中にスケルトン表示／追加失敗時に取得済み店舗を維持 |
| UoW-3 | `/results` 右側に実地図が表示される／座標付き店舗がマーカー表示される／マーカーと店舗カードの対応が分かる／地図失敗時も一覧・比較が使える |
| UoW-4 | 最終候補を選ぶと地図が表示される／座標なし時は架空位置を出さない／Google Maps で店舗を開ける／既存の理由・確認事項の読みやすさを維持 |

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

### UoW-1: Places 店舗データ解決と mock mode

- Bolt 1-1（Places FieldMask とレスポンス変換）
  - Red: `placeId` と Place Details レスポンスを入力に、`location` / `address` / `photoUrl` 候補へ変換する純粋関数テストを書く。FieldMask が `location,formattedAddress,shortFormattedAddress,types,viewport,plusCode,photos` 以内で、`displayName` / `rating` / `reviews` などを含まないこともテストする。
  - Green: `app/server/clients/google-places.ts` または同等の client adapter と変換関数を実装する。
  - Verify: `pnpm test` + `pnpm run typecheck`。
- Bolt 1-2（検索オーケストレーションへの接続）
  - Red: `searchRestaurants` の依存注入テストで、通常 mode 相当では10件分だけ Places 解決を呼び、失敗した候補は `null` フォールバックになることを書く。
  - Green: `restaurant-search.ts` に Places 解決を接続する。外部 API 失敗時は候補自体を落とさない。
  - Verify: `pnpm test` + `/api/restaurants/search` の mock dependency テスト。
- Bolt 1-3（mock mode）
  - Red: `MODE=mock` の resource route が Gemini / Places を呼ばず、座標・住所・代表写真付きモックを返すテストを書く。
  - Green: `api.restaurants.search.tsx` と `app/mocks/` を実装する。
  - Verify: `pnpm test` + `pnpm dev:mock` で `/results` がモック店舗を表示することを確認。

### UoW-2: 10件単位の取得・追加読み込み・スケルトン

- Bolt 2-1（API 契約と状態追記）
  - Red: `limit` / `offset`（または採用するページング値）を含む検索条件から、初回10件・追加10件が分かれて返ることを route/service テストで書く。
  - Green: `/api/restaurants/search` と `ResultsScreen` の取得契約を更新し、`setRestaurants` では初回置換、追加時は追記できるようにする。
  - Verify: `pnpm test`。
- Bolt 2-2（初回・追加取得スケルトン）
  - Red: 初回検索中に専用ロード画面ではなく店舗カード形状のスケルトンが DOM に出ること、追加取得中に既存店舗の下へスケルトンが出ることをコンポーネントテストで書く。
  - Green: `StoreListSkeleton` / 追加取得中表示 / 再試行導線を実装する。
  - Verify: `pnpm test` + `pnpm dev:mock` で1秒スケルトン→モック表示を確認。
- Bolt 2-3（スクロールトリガー）
  - Red: 最下部 sentinel が表示されたときだけ追加取得が1回走り、連打・重複取得しないことをテストで書く。
  - Green: IntersectionObserver またはスクロール判定で追加取得を実装する。
  - Verify: `/results` で最下部スクロール→追加10件追記、失敗時再試行を手動確認。

### UoW-3: 検索結果地図

- Bolt 3-1（Google Maps provider と地図フォールバック）
  - Red: `VITE_GOOGLE_MAPS_BROWSER_KEY` がない場合、地図部分がエラー/未設定表示になり、一覧は表示されることをテストする。
  - Green: `@vis.gl/react-google-maps` の `APIProvider` / `Map` を共通コンポーネント化し、キー未設定・読み込み失敗のフォールバックを実装する。
  - Verify: `pnpm test` + `pnpm run typecheck`。
- Bolt 3-2（マーカー表示と範囲調整）
  - Red: `location` を持つ店舗だけマーカー対象になり、`location: null` は除外される純粋関数/コンポーネントテストを書く。
  - Green: `ResultsMap` を実地図へ置き換え、店舗群に合わせた初期表示範囲を実装する。
  - Verify: `pnpm dev:mock` でマーカー表示・座標なし除外を確認。
- Bolt 3-3（カード/マーカー連動）
  - Red: マーカークリックで対象店舗のカードが強調され、カードフォーカス/選択で対象マーカーが強調されるテストを書く。
  - Green: `ResultsScreen` または子コンポーネントに画面ローカルの active store state を追加する。
  - Verify: `/results` でカード/マーカー連動を手動確認。

### UoW-4: 最終候補地図と Google Maps 導線

- Bolt 4-1（最終候補地図）
  - Red: `FinalStorePanel` が `location` ありなら単店舗地図、なしなら「地図情報なし」を表示するテストを書く。
  - Green: 検索結果地図と同じ地図プリミティブで最終候補地図を実装する。
  - Verify: `/compare` で最終候補選択→地図表示を確認。
- Bolt 4-2（Google Maps リンク）
  - Red: `placeId` が `places/...` の場合は `place_id` URL、ない場合は店舗名+住所/エリアの検索 URL を生成する純粋関数テストを書く。
  - Green: `FinalStorePanel` の導線を「Google Mapで開く」にし、予約導線を出さない。
  - Verify: `/compare` でリンク URL と文言を確認。
- Bolt 4-3（既存説明とのレイアウト整合）
  - Red: 理由・予約前確認事項・地図・リンクが同時に表示されても主要テキストが消えないことをコンポーネントテストまたは目視観点として固定する。
  - Green: 最終候補パネルのレイアウトを調整する。
  - Verify: `/compare` の最終候補パネルを desktop/mobile 幅で確認 + 共通 Verify。
