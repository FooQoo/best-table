# UoW-2 実装計画: 比較フローの分かりやすさ・可逆性

## 現状分析

- 比較関連ロジックは `useBooking().toggleCompare` に実装済み（上限5件、UoW-0 のテストで担保）。
- 比較 UI は `app/components/feature/results/compare-tray.tsx`（検索結果側のトレイ）と
  `app/components/feature/compare/{compare-screen,compare-table,empty-compare-state}.tsx` に分かれている。
- `empty-compare-state.tsx` が既に存在するため、0件表示自体は用意されている。1件・上限件数（5件）の
  境界表示が未検証。

## 実装方針

- ロジック（追加・削除・上限）は UoW-0 で担保済みなので、UoW-2 では UI 側の境界挙動
  （トレイ⇄比較画面の往復、戻る導線、0/1/5件時の表示）にフォーカスする。
- 変更するファイル一覧:
  - `app/components/feature/results/compare-tray.tsx` — 追加/削除操作と比較画面への導線
  - `app/components/feature/compare/compare-screen.tsx`, `compare-table.tsx`, `empty-compare-state.tsx`
    — 境界状態（0/1/5件）の表示調整
  - `app/state/booking-context.test.tsx` — 追加のロジックがあれば追記（UI 自体は手動確認）

## Bolt 順序と Red/Green/Verify

`docs/UNIT_OF_WORK.md` の UoW-2 節（Bolt 2-1, 2-2）のとおり。
Bolt 2-1 の Red は `toggleCompare` の追加テスト（UoW-0 で一部実装済み、重複追加無視のケースを補強）。
Bolt 2-2 の Red は「0件／1件／5件のときに何が表示されるべきか」を先にケースとして書き出し、
可能な範囲でコンポーネントテスト（`@testing-library/react`）に落とす。

## リスク・懸念

- `compare-tray.tsx` と `compare-screen.tsx` で比較件数の表示ロジックが重複している場合、
  UoW-6（データモデル再構成）で二重管理にならないよう、共通化を検討する（ただしスコープ外なら
  UoW-6 の懸念として送る）。

## 完了の定義

- `docs/UNIT_OF_WORK.md` の UoW-2 Verify（境界状態3パターンのスクリーンショット、戻り導線確認）を満たす。
