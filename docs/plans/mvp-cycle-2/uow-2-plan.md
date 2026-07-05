# UoW-2 実装計画: 10件単位の取得・追加読み込み・スケルトン

> `docs/plans/mvp-cycle-2/UNIT_OF_WORK.md` の UoW-2 を対象にする。
> UoW-1 が出す「座標・住所・代表写真を持ちうる `Restaurant[]`」を前提に、検索結果の取得単位と待機表示を整える。

## 現状分析

- 関連ファイル:
  - `app/routes/api.restaurants.search.tsx`
  - `app/server/services/restaurant-search.ts`
  - `app/server/services/restaurant-search.test.ts`
  - `app/components/feature/results/results-screen.tsx`
  - `app/components/feature/results/store-list.tsx`
  - `app/components/feature/results/store-list-skeleton.tsx`
  - `app/state/booking-context.tsx`
  - `app/mocks/data.ts`
- 現状の実装/データ:
  - `/results` は検索条件を `useFetcher` で `/api/restaurants/search` に POST し、返ってきた `restaurants` を Jotai の booking context に保存する。
  - `MODE=mock` では1秒待って `MAP_RENDERING_MOCK_RESTAURANTS` を返す。
  - `StoreListSkeleton` は存在し、初回検索中のスケルトン表示には使える。
  - API 契約にはまだ `limit` / `offset` / `hasMore` などのページング概念がない。
  - 追加読み込み中に既存店舗を残したまま下部にスケルトンを出す状態管理は未実装。
- 前提 UoW からの引き継ぎ事項:
  - UoW-1 で `Restaurant.location` / `address` / `photoUrl` が埋まりうる。
  - `MODE=mock` では Gemini / Places を呼ばず、1秒後にモック店舗を返す。

## 実装方針

- アプローチ:
  - 検索 API の入力に `limit` / `offset` を追加し、レスポンスに `restaurants` / `fromCache` / `hasMore` / `nextOffset` を返す。
  - 初回検索は `limit=10, offset=0`、最下部到達時は `limit=10, offset=現在件数` で追加取得する。
  - `ResultsScreen` は初回取得と追加取得を分けて扱い、初回はリスト全体をスケルトン、追加時は既存リスト下部にスケルトンを表示する。
  - 追加取得失敗時は既存店舗を保持し、下部に再試行導線を出す。
- 変更するファイル一覧:
  - `app/routes/api.restaurants.search.tsx` — `limit` / `offset` を受け取り、mock mode でも該当範囲だけ返す。
  - `app/server/services/restaurant-search.ts` — ページング可能な検索結果型へ拡張する。実検索の候補数制御は UoW-1/検索実装の制約を踏まえて最小差分にする。
  - `app/server/services/restaurant-search.test.ts` — 初回10件・追加10件の契約テストを追加する。
  - `app/components/feature/results/results-screen.tsx` — 初回取得、追加取得、追加失敗、再試行、sentinel を管理する。
  - `app/components/feature/results/store-list-skeleton.tsx` — 初回用/追加用で件数を指定できるようにする。
  - `app/components/feature/results/store-list.test.tsx` または新規 results screen test — スケルトン表示と追加取得 UI を固定する。
  - `app/state/booking-context.tsx` — 必要なら追記更新用 action を追加する。既存の `setRestaurants` で足りる場合は変更しない。

## Bolt 順序と Red/Green/Verify

### Bolt 2-1: API 契約と状態追記

Red:
- `limit` / `offset` を含む検索条件で、初回10件・追加10件が分かれて返る route/service テストを書く。
- 追加取得時に既存の `Restaurant[]` が置換されず追記されることをコンポーネントまたは state テストで書く。

Green:
- `/api/restaurants/search` と `ResultsScreen` の取得契約を更新する。
- 初回取得は置換、追加取得は追記にする。

Verify:
- `pnpm test`

### Bolt 2-2: 初回・追加取得スケルトン

Red:
- 初回検索中に専用ロード画面ではなく店舗カード形状のスケルトンが DOM に出ることを書く。
- 追加取得中に既存店舗の下へスケルトンが出ることを書く。

Green:
- 初回用・追加用のスケルトン表示を実装する。
- 追加失敗時の再試行導線を実装する。

Verify:
- `pnpm test`
- `pnpm dev:mock` で1秒スケルトン→モック表示を確認する。

### Bolt 2-3: スクロールトリガー

Red:
- 最下部 sentinel が表示されたときだけ追加取得が1回走ることを書く。
- `isLoadingMore` 中や `hasMore=false` では重複取得しないことを書く。

Green:
- IntersectionObserver で追加取得を実装する。
- IntersectionObserver が使えないテスト環境では mock しやすい薄い hook / helper に切る。

Verify:
- `/results` で最下部スクロール→追加10件追記を確認する。
- 追加失敗時に取得済み店舗が消えないことを確認する。

## リスク・懸念

- Gemini grounding が常に十分な件数を返すとは限らないため、実 mode では `hasMore` の意味を「追加取得を試せる余地」以上に断定しない。
- 追加取得時に同じ候補が重複する可能性があるため、`Restaurant.id` で重複排除する方針を検討する。
- IntersectionObserver はテストが脆くなりやすい。UI テストでは sentinel 発火を明示的に制御できる形にする。
- `MODE=mock` は1秒遅延が必要だが、テストで毎回1秒待つと遅くなるため、route action のテストでは delay を注入可能にするかコンポーネント側で fake timer を使う。

## 完了の定義

- 初回検索で最大10件が表示される。
- 最下部スクロールで追加10件が既存リストの下に追記される。
- 初回・追加取得中は店舗カード形状のスケルトンが表示され、専用ロード画面は出ない。
- 追加取得失敗時も取得済み店舗は維持される。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。

## 実装結果

Bolt 2-1〜2-3 まで完了。

- Bolt 2-1: `/api/restaurants/search` と `searchRestaurants` に `limit` / `offset` を追加し、`hasMore` / `nextOffset` を返す契約へ拡張した。`BookingContext` には `appendRestaurants` を追加し、既存店舗を残して新規 ID のみ追記する。
- Bolt 2-2: 初回検索は `StoreListSkeleton`、追加取得中は既存リスト下部に `StoreListSkeletonItems` を表示する。追加失敗時に取得済み店舗を維持したまま再試行導線を表示できる footer を `StoreList` に追加した。
- Bolt 2-3: `ResultsScreen` に最下部 sentinel と IntersectionObserver を追加し、`hasMore` / `nextOffset` / `isLoadingMore` によって重複取得を防ぐ。
- mock mode: ページング確認のため `MAP_RENDERING_MOCK_RESTAURANTS` を20件に拡張した。

Verify:
- `pnpm test`（113件）
- `pnpm run typecheck`
- `pnpm build`
- `MODE=mock pnpm exec react-router dev --host 127.0.0.1 --port 5180` で `/` `/hearing` `/results` `/compare` が 200
- `/api/restaurants/search` mock mode で `limit=10, offset=0` が `mock-1`〜`mock-10` / `hasMore=true` / `nextOffset=10`、`offset=10` が `mock-11`〜`mock-20` / `hasMore=false`
