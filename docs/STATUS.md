# 開発状況

`docs/UNIT_OF_WORK.md` で定義した Unit of Work（UoW）ごとの進捗を管理する。
実装を進めるたびに、このファイルの該当行と「現在地」を更新する。

## 現在地

- **着手中の UoW**: なし（UoW-0, UoW-1, UoW-2 完了）
- **次のアクション**: UoW-3（相手種別に応じた評価の重み付け）または UoW-4（懸念タグ・推奨理由・AI 質問応答例）に着手する（両方 UoW-1 完了済みで並行可）。

## ステータス一覧

状態は次のいずれかで管理する。

- `未着手`: 実装計画（`docs/plans/uow-N-plan.md`）のみ、または計画すら未作成
- `計画済み`: 実装計画は作成済みだが Bolt に未着手
- `進行中`: いずれかの Bolt が Red/Green/Verify の途中
- `完了`: すべての Bolt が Verify まで通過、`docs/UNIT_OF_WORK.md` の完了条件を満たした

| UoW | タイトル | 状態 | 直近の Bolt | 実装計画 | 備考 |
|---|---|---|---|---|---|
| UoW-0 | テスト基盤の導入 | 完了 | - | [docs/plans/uow-0-plan.md](plans/uow-0-plan.md) | Vitest + Testing Library 導入、`pnpm test` green、typecheck/build 確認済み |
| UoW-1 | プロダクト言葉遣い・状態の一貫性 | 完了 | 1-2 | [docs/plans/uow-1-plan.md](plans/uow-1-plan.md) | Bolt 1-1: 状態受け渡しテスト追加（既存実装で green）。Bolt 1-2: `docs/DESIGN.md` に用語対応表を追加、4画面を実機確認し表記ゆれなしを確認済み |
| UoW-2 | 比較フローの分かりやすさ・可逆性 | 完了 | 2-2 | [docs/plans/uow-2-plan.md](plans/uow-2-plan.md) | Bolt 2-1: `toggleCompare` のトグル挙動（追加・削除）テストを追加。Bolt 2-2: 0/1/5件の境界状態テストを追加し、実機確認で5件表示時に狭い画面幅で比較表がはみ出し列が見えなくなる崩れを発見・修正（`overflow-hidden`→`overflow-x-auto`、列に`minmax(150px,1fr)`を指定） |
| UoW-3 | 相手種別に応じた評価の重み付け | 計画済み | 未着手 | [docs/plans/uow-3-plan.md](plans/uow-3-plan.md) | `COUNTERPARTS`5種と受け入れ条件3パターンの対応関係を着手時に確定要 |
| UoW-4 | 懸念タグ・推奨理由・AI 質問応答例 | 計画済み | 未着手 | [docs/plans/uow-4-plan.md](plans/uow-4-plan.md) | `/stores/:storeId` ルート新規作成を含む |
| UoW-5 | 最終候補の説明文面 | 計画済み | 未着手 | [docs/plans/uow-5-plan.md](plans/uow-5-plan.md) | UoW-3, UoW-4 完了後に着手 |
| UoW-6 | ドメインデータモデルの再構成 | 計画済み | 未着手 | [docs/plans/uow-6-plan.md](plans/uow-6-plan.md) | UoW-3, 4, 5 完了後に着手 |
| UoW-7 | 検索・空席・AI 生成の実接続 | 計画済み | 未着手 | [docs/plans/uow-7-plan.md](plans/uow-7-plan.md) | UoW-6 完了後に着手。外部 I/F 未確定 |

## 更新履歴

| 日付 | 内容 |
|---|---|
| 2026-07-05 | UoW-0（テスト基盤導入）を完了。UoW-1〜7 の実装計画を作成し「計画済み」に更新。本ファイルを新規作成。 |
| 2026-07-05 | UoW-1（プロダクト言葉遣い・状態の一貫性）を完了。`booking-context` の状態受け渡しテストを追加、`docs/DESIGN.md` に用語対応表を追加し、`/` `/hearing` `/results` `/compare` を一気通貫で実機確認。`pnpm test` / `pnpm run typecheck` / `pnpm build` すべて green。 |
| 2026-07-05 | UoW-2（比較フローの分かりやすさ・可逆性）を完了。`toggleCompare` のトグル挙動テストと `CompareScreen` の0/1/5件境界状態テストを追加。実機確認（`/results` ⇄ `/compare` の往復、0/1/5件の表示）で、5件比較時に画面幅が狭いと比較表がはみ出して2店舗分の列が見えなくなる崩れを発見し、`compare-table.tsx` を `overflow-x-auto` + 列の `minmax(150px, 1fr)` に修正。`pnpm test` / `pnpm run typecheck` / `pnpm build` すべて green。 |
