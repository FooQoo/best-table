# UoW-2 実装計画: トップ・ヒアリングの query 同期

> `docs/plans/mvp-cycle-5/UNIT_OF_WORK.md` の UoW-2 を対象にする。
> この計画書は実装前の作業手順を整理するものであり、このファイル作成時点では実装には入らない。

## 現状分析

- 関連ファイル:
  - `app/state/booking-context.tsx`
  - `app/state/booking-query-state.ts`（UoW-1 で追加予定）
  - `app/components/feature/top/top-screen.tsx`
  - `app/components/feature/top/area-picker.tsx`
  - `app/components/feature/hearing/hearing-screen.tsx`
  - `app/components/feature/hearing/counterpart-step.tsx`
  - `app/components/feature/hearing/budget-step.tsx`
  - `app/components/feature/hearing/priority-step.tsx`
  - `app/components/feature/layout/app-layout.tsx`
  - `app/state/booking-context.test.tsx`
- 現状の実装/データ:
  - `TopScreen` は `useBooking()` から `state`, `setDate`, `setTime`, `incPeople`, `decPeople` を取り、`navigate("/hearing")` で次画面へ進む。
  - `AreaPicker` は `useBooking()` から `selectedAreas`, `toggleCity`, `removeArea` を使う。
  - `HearingScreen` は `useBooking()` の `state` を参照して step ごとの submit 可否を判定し、完了時に `navigate("/results")` する。
  - `CounterpartStep` / `BudgetStep` / `PriorityStep` もすべて `useBooking()` に直接依存している。
  - 既存テストは Jotai の Provider 配下で state が画面遷移相当でも残ることを確認しているが、URL query への反映は見ていない。
- 前提 UoW からの引き継ぎ事項:
  - `BookingQueryState` 型。
  - `nuqs` parser / setter。
  - query state から正規化済み検索・会食条件を作る関数。
  - 不正値の normalize テスト。

## 実装方針

- アプローチ:
  - 画面コンポーネントから直接 `nuqs` を散らさず、`useBookingQuery()` のような hook を `app/state/booking-query-state.ts` または隣接ファイルに作る。
  - UoW-2 では検索・会食条件の読み書きを query state に移し、比較候補や店舗結果は既存 `useBooking()` に残す。
  - React Router Framework Mode の SSR 境界に合わせ、`nuqs` の adapter は使わず、`useBookingQuery()` 内で `useSearchParams` を使って URL を更新する。
  - 既存コンポーネントの差分を抑えるため、`useBookingQuery()` は `state` と `setDate` / `toggleCity` など既存 `useBooking()` に近い操作名を返す。
  - `navigate("/hearing")` / `navigate("/results")` は query を落とさない形にする。React Router の relative path で search が落ちる場合は、現在の `location.search` を付けて遷移する薄い helper を使う。
  - 「TOPに戻る」は検索基本条件を保持したまま戻る。明示的な新規検索のリセットは UoW-3 の条件変更導線で整理する。
- 変更するファイル一覧:
  - `app/state/booking-query-state.ts` — `useBookingQuery()` と setter 群を追加する。
  - `app/components/feature/top/top-screen.tsx` — 基本条件の読み書きを query state へ変更する。
  - `app/components/feature/top/area-picker.tsx` — エリア選択を query state へ変更する。
  - `app/components/feature/hearing/hearing-screen.tsx` — submit 可否と遷移を query state 由来に変更する。
  - `app/components/feature/hearing/counterpart-step.tsx` — 相手種別と自由入力を query state へ変更する。
  - `app/components/feature/hearing/budget-step.tsx` — 予算と自由入力を query state へ変更する。
  - `app/components/feature/hearing/priority-step.tsx` — 重視条件と自由入力を query state へ変更する。
  - `app/components/feature/top/top-screen.test.tsx` / `app/components/feature/hearing/hearing-screen.test.tsx` など — query 更新と遷移維持のテストを追加する。既存のテスト配置に合わせ、必要なら新規作成する。
  - `app/state/booking-context.test.tsx` — Jotai-only の「画面遷移でも検索条件が保持される」テストは、URL query state のテストへ移すか、比較候補など一時状態のテストに役割を絞る。

## Bolt 順序と Red/Green/Verify

### Bolt 2-1: トップ基本条件

Red:
- `/` の日付・時刻・人数操作で query state setter が呼ばれることをテストする。
- `AreaPicker` でエリアを追加・削除したとき、query state の `selectedAreas` が更新されることをテストする。
- query に初期値と異なる値がある場合、`TopScreen` の入力に復元されることをテストする。

Green:
- `TopScreen` を `useBookingQuery()` に接続する。
- `AreaPicker` を `useBookingQuery()` に接続する。
- 人数の increment/decrement は 1 未満にならない既存制約を query setter 側でも守る。

Verify:
- `/` でエリア、日付、時刻、人数を変更すると URL query が変わることを手動確認する。
- query 付き `/` を直接開いたとき、入力に反映されることを確認する。

### Bolt 2-2: ヒアリング条件

Red:
- 相手種別を選ぶと `counterpart` query が更新され、`other` 選択時の自由入力が `counterpartOtherText` に入ることをテストする。
- 予算の下限・上限・自由入力トグルが query に反映されることをテストする。
- 重視条件が最大3件まで query に入り、選択済みをもう一度押すと外れることをテストする。
- query 付き `/hearing` を開いたとき、選択済み UI が復元されることをテストする。

Green:
- `CounterpartStep` / `BudgetStep` / `PriorityStep` を `useBookingQuery()` に接続する。
- step の submit 可否判定を query state 由来に変更する。
- 自由入力の trim / 長さ上限は UoW-1 の normalize と矛盾しないようにする。

Verify:
- `/hearing` の各ステップで query が維持・更新されることを手動確認する。
- `other` の自由入力が空の場合は既存どおり次へ進めないことを確認する。

### Bolt 2-3: 遷移時の query 維持

Red:
- `/` から `/hearing`、`/hearing` から `/results` へ進むとき search params が落ちないことをテストまたは確認観点として固定する。
- `TOPに戻る` で `/` に戻っても query が残ることを確認観点として固定する。

Green:
- `navigate` 呼び出しを query 維持 helper に置き換える。
- `app/components/feature/layout/app-layout.tsx` のロゴ/ホーム遷移が query を破棄すべきか維持すべきかを決める。既定はプロダクトの「条件編集」文脈を優先し、明示的リセット操作以外では query を落とさない。

Verify:
- `/` → `/hearing` → `/results` の一気通貫で URL query が維持されることを確認する。
- ブラウザ戻るで `/hearing` に戻ったとき、入力状態が query と一致することを確認する。

## リスク・懸念

- 既存コンポーネントが `useBooking()` に密結合しているため、一気に置き換えると差分が広い。`useBookingQuery()` の戻り値を既存 action 名に寄せて変更量を抑える。
- query setter は URL 更新を伴うため、入力ごとに history が増えすぎる可能性がある。自由入力は replace 更新にするなど、実装時に履歴制御を確認する。
- URL に日本語のエリア名や予算ラベルが入る。固定語彙の id 化を急にやると既存表示との対応が複雑になるため、UoW-1 の query 表現に従う。
- React Router の routing context 外で query hook を呼ぶと動かない。`useBookingQuery()` は `_layout` 配下の画面コンポーネントから使う。

## 完了の定義

- `/` のエリア・日付・時刻・人数が URL query に反映される。
- `/hearing` の相手種別・予算・重視条件・自由入力が URL query に反映される。
- query 付き `/` / `/hearing` を直接開くと入力状態が復元される。
- `/` → `/hearing` → `/results` の遷移で query が消えない。
- 比較候補や店舗結果は query state に含めていない。
- UoW-2 で追加・更新したテスト、`pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。
