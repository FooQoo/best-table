# UoW-1 実装計画: URL query state のモデル化

> `docs/plans/mvp-cycle-5/UNIT_OF_WORK.md` の UoW-1 を対象にする。
> この計画書は実装前の作業手順を整理するものであり、このファイル作成時点では実装には入らない。

## 現状分析

- 関連ファイル:
  - `package.json`
  - `app/root.tsx`
  - `app/state/booking-context.tsx`
  - `app/state/booking-context.test.tsx`
  - `app/domain/models/restaurant.ts`
  - `app/domain/models/results-chat.ts`
  - `app/server/services/restaurant-search-query.ts`
  - `app/mocks/data.ts`
  - `docs/plans/mvp-cycle-5/PLANS.md`
  - `docs/plans/mvp-cycle-5/UNIT_OF_WORK.md`
- 現状の実装/データ:
  - `nuqs` はまだ `package.json` に入っていない。
  - `BookingProvider` は `app/root.tsx` で `JotaiProvider` だけを提供している。
  - `BookingState` は検索・会食条件、比較候補、取得済み `Restaurant[]` を同じ atom に持っている。
  - `initialBookingState` は検索条件の初期値としても、比較候補・店舗結果の初期値としても使われている。
  - 固定語彙は `app/mocks/data.ts` の `AREA_REGIONS` / `BUDGET_STEPS` / `COUNTERPARTS` / `PRIORITIES` が実質的な single source of truth。
  - 重視条件の上限は `MAX_PRIORITY_COUNT`、比較候補の上限は `MAX_COMPARE_COUNT` として `app/domain/models/restaurant.ts` にある。
- 前提 UoW からの引き継ぎ事項:
  - なし。UoW-1 は後続 UoW の土台になる。

## 実装方針

- アプローチ:
  - `nuqs` を依存に追加し、parser / serializer を検索・会食条件の query schema 定義に使う。
  - React Router Framework Mode では `nuqs/adapters/react-router/v8` が SSR 時に `useNavigate` の Router context 外で評価されるため、URL 更新は React Router の `useSearchParams` で行う。
  - URL に保存する検索・会食条件を `BookingQueryState` のような専用型として切り出し、`compareIds` / `restaurants` とは型レベルでも分ける。
  - query parser と normalize は UI から独立した純粋関数にし、UoW-2/3 で画面へ接続する。
  - query の表現は短く、かつ固定語彙の id/key をそのまま使う。自由入力は URL に入る前提で長さ上限と trim を通す。
  - 初期値省略の扱いは `nuqs` の default value 機構に寄せ、空 query でも `initialBookingState` 相当の検索条件に復元できるようにする。
  - 不正 query はエラーにせず、固定語彙・型・上限に合わせて正規化する。検索 API や AI prompt へ未検証値を渡さないことを最優先にする。
- 変更するファイル一覧:
  - `package.json` — `nuqs` を dependencies に追加する。
  - `app/root.tsx` — provider 追加は行わない。`useSearchParams` を使うため、既存の React Router context を利用する。
  - `app/state/booking-query-state.ts` — URL query state の型、parser、初期値、normalize、検索条件への変換を追加する。
  - `app/state/booking-query-state.test.ts` — 空 query、正常値、不正値、初期値省略のテストを追加する。
  - `app/state/booking-context.tsx` — UoW-1 では大きく変更しない。必要なら `BookingRequest` 相当の型抽出だけに留める。
  - `app/domain/models/results-chat.ts` — 既存型を変更せず、query state から `ResultsChatBookingSummary` を作る関数側で対応する。

## Bolt 順序と Red/Green/Verify

### Bolt 1-1: query schema と初期値

Red:
- `app/state/booking-query-state.test.ts` に、空 query から `initialBookingState` 相当の検索条件が復元されるテストを書く。
- `selectedAreas` / `priorities` の配列、`people` の number、`budgetOtherOn` / `priorityOtherOn` の boolean が期待型へ変換されるテストを書く。

Green:
- `BookingQueryState` 型を定義する。
- `nuqs` parser 定義と、query state を正規化済み検索条件へ変換する純粋関数を実装する。
- `initialBookingState` から検索・会食条件の初期値だけを参照し、比較候補や `restaurants` を query state に含めない。

Verify:
- `pnpm test app/state/booking-query-state.test.ts`。

### Bolt 1-2: 不正値の正規化

Red:
- 未知のエリア、未知の相手種別、未知の重視条件が除外または初期値へ戻ることをテストする。
- 4件以上の `priorities` が `MAX_PRIORITY_COUNT` までに丸められることをテストする。
- `people=0` / `people=-1` / 非数値が 1 以上の値に正規化されることをテストする。
- 不正 boolean が false 相当に戻ることをテストする。
- 自由入力が trim され、長さ上限を超えた場合に切り詰められることをテストする。

Green:
- `AREA_REGIONS` / `COUNTERPARTS` / `PRIORITIES` / `BUDGET_STEPS` から許可集合を作り、normalize 処理へ集約する。
- `counterpartOtherText` / `budgetOtherText` / `priorityOtherText` の長さ上限を定数化する。
- `budgetOtherOn` が false の場合でも `budgetOtherText` は URL から復元してよいが、検索条件として使うかどうかは `budgetOtherOn` を正とする。

Verify:
- `pnpm test app/state/booking-query-state.test.ts`
- `pnpm run typecheck`

## リスク・懸念

- `nuqs` の React Router adapter API はバージョン依存のため、実装時にインストール済み package の docs を確認する。
- URL に自由入力を保持するため、長さ制限と SECURITY.md の注意書きを実装でも担保する必要がある。
- `BookingState` との互換性を一気に壊すと UoW-2/3 の差分が大きくなる。UoW-1 では純粋関数と型を先に固め、画面接続は後続へ残す。
- query key の命名を途中で変えると共有 URL 互換が壊れる。初回実装時に短く安定した名前へ固定する。

## 完了の定義

- URL query に保存するフィールドと保存しないフィールドの境界が型とテストで分かれている。
- 空 query から初期検索条件を復元できる。
- 正常 query から `BookingRequest` 相当の検索・会食条件を復元できる。
- 不正 query が固定語彙・型・上限に合わせて正規化される。
- `nuqs` parser / serializer を使った query schema がコード上で準備されている。
- `pnpm test app/state/booking-query-state.test.ts` / `pnpm run typecheck` が通る。
