# UoW-1 実装計画: プロダクト言葉遣い・状態の一貫性

## 現状分析

- 状態管理は `app/state/booking-context.tsx`（`useBooking`）に集約済み。`counterpart`、`priorities`、
  `compareIds`、`finalStoreId` など画面をまたぐ状態はすでに1つの atom で持てている。
- 画面別コンポーネント:
  - トップ: `app/components/feature/top/top-screen.tsx`, `area-picker.tsx`
  - ヒアリング: `app/components/feature/hearing/{hearing-screen,counterpart-step,budget-step,priority-step}.tsx`
    （`STEP_LABELS = ["相手", "ご予算", "重視条件"]` のように画面内で用語を持っている）
  - 検索結果: `app/components/feature/results/{results-screen,store-list,results-summary-bar,compare-tray,results-map}.tsx`
  - 比較: `app/components/feature/compare/{compare-screen,compare-table,empty-compare-state,final-store-panel}.tsx`
- 用語（「相手」「重視条件」「比較」など）は各コンポーネントにハードコードされており、一覧化されていない。

## 実装方針

- 先に用語対応表を作る（新規ドキュメント、もしくは `docs/DESIGN.md` 追記）。対象語彙:
  「相手／相手種別」「重視条件／こだわり」「比較に追加／比較へ」「最終候補／決定」。
- `useBooking` 側は UoW-0 のテストで挙動を担保済みなので、UoW-1 では状態の型・API は変更せず、
  各画面コンポーネントの文言のみを対応表に合わせて揃える。
- 変更するファイル一覧:
  - 新規: 用語対応表（`docs/DESIGN.md` に節を追加）
  - `app/components/feature/hearing/*.tsx` — ラベル文言の統一
  - `app/components/feature/results/*.tsx` — 文言の統一
  - `app/components/feature/compare/*.tsx` — 文言の統一
  - `app/state/booking-context.test.tsx` — 既存テストに、画面間で同じ `useBooking` インスタンスを
    参照する導線（Provider の位置）が壊れていないことを確認するケースを追加するかを Bolt 1-1 で判断

## Bolt 順序と Red/Green/Verify

`docs/UNIT_OF_WORK.md` の UoW-1 節（Bolt 1-1, 1-2）のとおり。
Bolt 1-1 の Red は既存の `booking-context.test.tsx` を拡張する形で追加テストを書く。
Bolt 1-2 の Red は「用語対応表」をテストではなくレビュー観点ドキュメントとして先に書く。

## リスク・懸念

- `app_layout.tsx`（共通レイアウト）がどこまで文言を握っているか未確認。着手時に grep で
  用語の重複定義がないか再確認する。
- 用語統一によりコンポーネント props の名前まで変える場合、型変更が UoW-3〜5 に影響するため、
  props 名は変えず表示文言のみ変更する方針とする。

## 完了の定義

- `docs/UNIT_OF_WORK.md` の UoW-1 Verify（`pnpm test` / 4画面一気通貫確認）を満たす。
- 用語対応表が `docs/DESIGN.md` に存在し、4画面のコンポーネントがそれに準拠している。
