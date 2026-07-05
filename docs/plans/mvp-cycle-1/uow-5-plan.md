# UoW-5 実装計画: 最終候補の説明文面

## 現状分析

- `useBooking().selectFinalStore` / `state.finalStoreId` は実装済み（UoW-0 のテスト対象外だが
  `resetForNewChat` で初期化されることは確認済み）。
- 最終候補表示 UI は `app/components/feature/compare/final-store-panel.tsx` が既に存在する
  （中身は未確認、UoW-5 着手時に読む）。
- UoW-3（重み付け）、UoW-4（懸念タグ・推奨理由）の出力を材料に説明文を組み立てるため、
  この2つが完了してからでないと材料が揃わない。

## 実装方針

- 純粋関数 `buildFinalStoreMessage(store, booking)` を実装し、
  `{ reason: string; checksBeforeBooking: string[] }` のような構造化データを返す。
  文字列直書きにせず構造化することで UoW-6（データモデル）と自然につながる。
- 変更するファイル一覧:
  - 新規: `app/utils/final-candidate-message.ts` / `.test.ts`
  - `app/components/feature/compare/final-store-panel.tsx` — 生成した理由・確認事項の表示

## Bolt 順序と Red/Green/Verify

`docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の UoW-5 節（Bolt 5-1）のとおり。

## リスク・懸念

- UoW-3/UoW-4 のデータ形状が固まる前に着手すると手戻りが大きい。依存関係マトリクスどおり
  UoW-3, UoW-4 完了後に着手する。

## 完了の定義

- `docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の UoW-5 Verify（説明文面に理由＋確認事項の両方が含まれる）を満たす。
