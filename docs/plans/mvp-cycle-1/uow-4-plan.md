# UoW-4 実装計画: 懸念タグ・推奨理由・AI 質問応答例

## 現状分析

- `Store` 型（`app/mocks/data.ts`）に `concern: string` が既にある（例:
  `"カウンター越しの接客"`, `"特になし"`）が、単一文字列でタグ化されていない。
- 推奨理由・AI 質問応答例に相当するフィールド／コンポーネントはまだ存在しない。
- 店舗詳細ルート（`/stores/:storeId`）自体が `app/routes/` に未実装（`_layout._index`,
  `_layout.hearing`, `_layout.results`, `_layout.compare` のみ）。UoW-4 の前半（懸念タグ・推奨理由の
  データとカード表示）は `/results` 内で先に進め、店舗詳細ルートの新規追加は本 UoW のスコープに
  含めて着手する。

## 実装方針

- `concern` を単一文字列のままにせず、`concernTags: string[]`（空配列可）と
  `recommendationReason: string` を `Store` 型に追加する。
- 変更するファイル一覧:
  - `app/mocks/data.ts` — `Store` 型に `concernTags`, `recommendationReason` を追加、既存6件を移行
  - 新規: `app/routes/_layout.stores.$storeId.tsx` — 店舗詳細ルート
  - 新規: `app/components/feature/store-detail/` 配下 — 懸念タグ表示、AI 質問応答例 UI
  - `app/components/feature/results/store-list.tsx` — カード上に懸念タグを常時表示（ホバー依存にしない）

## Bolt 順序と Red/Green/Verify

`docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の UoW-4 節（Bolt 4-1, 4-2）のとおり。
Bolt 4-1 の Red は `Store` 型・モックデータが `concernTags`/`recommendationReason` を必須で
持つことを検証するテスト。
Bolt 4-2 の Red は懸念タグがホバー操作なしで DOM に存在することを検証するコンポーネントテスト。

## リスク・懸念

- 店舗詳細ルートが未実装のため、UoW-4 は「データ拡張」と「新規ルート追加」の2つの塊を含む。
  見積もりが膨らむ場合は、店舗詳細ルート自体を別 UoW に切り出すことを検討する
  （`docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の依存関係マトリクス更新が必要になる）。
- AI 質問応答例は「空席・予約成立・裏付けのない事実を断定しない」ガードレール（`AGENTS.md`）に
  抵触しやすい領域。文面は実装前にレビュー観点として書き出す。

## 完了の定義

- `docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の UoW-4 Verify（懸念タグ常時表示、Q&A 文面レビュー）を満たす。
