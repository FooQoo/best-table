# UoW-3 実装計画: 検索結果の query 復元と再検索

> `docs/plans/mvp-cycle-5/UNIT_OF_WORK.md` の UoW-3 を対象にする。
> この計画書は実装前の作業手順を整理するものであり、このファイル作成時点では実装には入らない。

## 現状分析

- 関連ファイル:
  - `app/state/booking-context.tsx`
  - `app/state/booking-query-state.ts`（UoW-1 で追加予定）
  - `app/components/feature/results/results-screen.tsx`
  - `app/components/feature/results/results-screen.test.ts`
  - `app/components/feature/results/results-summary-bar.tsx`
  - `app/components/feature/results/results-map.tsx`
  - `app/components/feature/results/results-ai-chat.tsx`
  - `app/domain/models/results-chat.ts`
  - `app/server/services/restaurant-search-query.ts`
  - `app/routes/api.restaurants.search.stream.tsx`
- 現状の実装/データ:
  - `ResultsScreen` は `useBooking()` の `state` から `buildCondition()` と `chatBookingSummary` を作る。
  - 初回検索は `hasSubmittedRef` を使った `useEffect([])` で 1 回だけ実行される。
  - コメント上も「検索条件は /hearing 経由でのみ変わり、この画面滞在中は変わらない」前提になっている。
  - `submitSearch("initial")` は `restaurants` を空にし、`hasMore` / `nextOffset` / 詳細パネル / 比較サイドパネルを初期化するが、`compareIds` は `resetForNewChat()` 以外では明示クリアしていない。
  - `changeConditions()` は `resetForNewChat()` を呼んでから `navigate("/")` するため、現状は会食文脈・予算・重視条件を破棄する。
  - 地図の「このエリアを検索」は `activeSearchCenter` を使い、既存店舗を残した追加検索として `submitSearch("more", 0, latestMapCenter, { excludeExistingRestaurants: true })` を呼ぶ。
- 前提 UoW からの引き継ぎ事項:
  - query state から正規化済み検索・会食条件を復元できる。
  - `/` と `/hearing` の入力が query state に接続済み。
  - 遷移時に query が維持される。

## 実装方針

- アプローチ:
  - `ResultsScreen` の検索条件の正を `useBookingQuery()` に変更する。
  - query state から `RestaurantSearchQueryCondition` と `ResultsChatBookingSummary` を作る純粋関数を用意し、テストしやすくする。
  - 初回検索制御は `hasSubmittedRef` ではなく、正規化済み query から作る `searchConditionKey` ベースにする。key が変わったときだけ initial search を再実行する。
  - query key が変わる initial search では、取得済み `restaurants`、比較候補、詳細パネル、比較サイドパネル、地図中心の追加検索状態、load more 状態をクリアする。
  - StrictMode の二重実行で検索が永久停止しない既存の注意点は維持する。abort は「次の検索開始時に前回を abort」する方針を保つ。
  - 「条件を変更」は検索条件を破棄せず、query を維持したまま `/` または `/hearing` へ戻す。どちらへ戻すかは現行 UI の導線に合わせ、まず `/` に戻して基本条件から編集できる形にする。
  - 明示的な新規検索/新規相談の reset は、URL query の reset と Jotai 一時状態の reset を分けた action として整理する。
- 変更するファイル一覧:
  - `app/components/feature/results/results-screen.tsx` — `state` 由来の検索条件を query state 由来へ変更し、query key ベースの再検索制御を実装する。
  - `app/components/feature/results/results-screen.test.ts` — query 条件から condition/summary を組み立てる純粋関数、再検索条件、`changeConditions` 方針をテストする。
  - `app/state/booking-context.tsx` — `clearTransientResultsState` / `clearCompareSelection` など、URL query を触らない一時状態 reset action を追加または既存 `resetForNewChat` を分割する。
  - `app/state/booking-context.test.tsx` — reset action の対象が比較候補・店舗結果に限定されることをテストする。
  - `app/state/booking-query-state.ts` — `toRestaurantSearchCondition` / `toResultsChatBookingSummary` / `getSearchConditionKey` などの helper を追加する。
  - `app/components/feature/results/results-summary-bar.tsx` — 必要なら props 名や表示値だけ調整する。UI 表示自体は大きく変えない。

## Bolt 順序と Red/Green/Verify

### Bolt 3-1: 検索条件と summary の復元

Red:
- query 由来の正規化済み条件から、`RestaurantSearchQueryCondition` が既存 `/api/restaurants/search/stream` の body と同じ形で組み立てられることをテストする。
- 同じ条件から `ResultsChatBookingSummary` が組み立てられることをテストする。
- `ResultsSummaryBar` に渡す `recapKeyword` / `recapDateTime` / `recapBudget` / `recapPriorities` が query と一致することをテストする。

Green:
- `ResultsScreen` の `buildCondition` と `chatBookingSummary` を query state 由来にする。
- `state.selectedAreas` など検索条件参照を query state 参照へ置き換える。
- `compareIds` / `restaurants` は引き続き Jotai の一時状態から読む。

Verify:
- `/results?...` を直接開いたとき、サマリー表示が query と一致することを手動確認する。
- `/api/restaurants/search/stream` に送る body が query 条件を反映していることを mock/devtools またはテストで確認する。

### Bolt 3-2: query 変更時の再検索

Red:
- `searchConditionKey` が同じなら initial search を重複実行しないことをテストする。
- `searchConditionKey` が変わったら取得済み店舗・比較候補・詳細選択・比較パネル状態をクリアし、initial search を1回だけ起動することをテストまたは hook レベルの確認観点として固定する。
- StrictMode 相当の再レンダーで abort 済み検索だけが残らないことを確認観点として固定する。

Green:
- `hasSubmittedRef` を query key の記録 ref に置き換える。
- query key 変更時に `submitSearch("initial", 0, null)` を実行する。
- query key 変更時は `activeSearchCenter` / `latestMapCenter` / `showSearchThisArea` / `hiddenTiers` など条件に紐づく表示状態を初期化する。
- Jotai の一時状態 reset action で `compareIds` と `restaurants` をクリアする。

Verify:
- `/results` リロードで URL 条件の検索が再実行されることを確認する。
- ブラウザ戻る/進むで query が変わった場合、古い店舗一覧が残らず再検索されることを確認する。
- 地図の「このエリアを検索」は query を書き換えず、追加検索として残ることを確認する。

### Bolt 3-3: 条件変更導線

Red:
- 「条件を変更」が query を破棄せず `/` へ戻ることを確認観点として固定する。
- 明示的な新規検索 reset は query と一時状態のどちらを消すかが分かれていることをテストする。

Green:
- `changeConditions()` から `resetForNewChat()` を外し、query を維持して `/` へ戻る。
- 既存の `resetForNewChat()` を必要に応じて `resetQueryForNewChat` と `resetTransientState` に分ける。
- App header など別のホーム遷移がある場合、条件編集か新規開始かの意図に合わせて query 維持/破棄を整理する。

Verify:
- `/results` の「条件を変更する」から `/` に戻ったとき、直前の基本条件が入力済みで表示されることを確認する。
- そのまま `/hearing` に進むと、相手種別・予算・重視条件も復元されることを確認する。
- 新しい条件に変えて `/results` に進むと、新しい query key で再検索されることを確認する。

## リスク・懸念

- `ResultsScreen` の `submitSearch` は状態依存が多く、依存配列を変えると意図せず再検索が増える可能性がある。検索条件 key と検索実行関数の責務を分ける。
- query 変更時の reset が不足すると、古い条件の比較候補や店舗が新しい条件に混ざる。`restaurants` と `compareIds` は必ず query key 変更時にクリアする。
- `activeSearchCenter` は地図追加検索用で、URL query のエリアとは別物。query key 変更時にはリセットし、地図追加検索では query を書き換えない。
- `ResultsChatBookingSummary` が古い Jotai state を参照し続けると AI チャットの前提がずれる。summary は query 由来に一本化する。
- リロード/直接アクセスの挙動は mock mode と real mode の両方で確認が必要。real mode は外部 API の失敗もあるため、最低限 mock mode で一気通貫確認する。

## 完了の定義

- `/results?...` の直接アクセスで URL query 由来の条件を使って検索する。
- `/results` のリロードで条件が初期値に戻らない。
- ブラウザ戻る/進むで query が変わると、検索結果・サマリー・AI チャット summary が新しい条件に揃う。
- query key 変更時に取得済み店舗と比較候補がクリアされる。
- 「条件を変更」で戻った先に直前条件が残る。
- 比較候補、表示済み追加検索結果、詳細パネル、地図凡例は共有 URL の再現対象外として実装上も URL に保存しない。
- UoW-3 で追加・更新したテスト、`pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
