# 開発状況

`docs/UNIT_OF_WORK.md` で定義した Unit of Work（UoW）ごとの進捗を管理する。
実装を進めるたびに、このファイルの該当行と「現在地」を更新する。

## 現在地

- **着手中の UoW**: なし（UoW-0, UoW-1, UoW-2, UoW-3, UoW-4, UoW-5 完了）
- **次のアクション**: UoW-6（ドメインデータモデルの再構成）に着手する（UoW-3, UoW-4, UoW-5 完了済みで着手可）。

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
| UoW-3 | 相手種別に応じた評価の重み付け | 完了 | 3-2 | [docs/plans/uow-3-plan.md](plans/uow-3-plan.md) | Bolt 3-1: `app/utils/scoring.ts` に `getEmphasisKeys` を実装（exec→room/prestige/service、partner・boss→quiet/access、thanks/bond は partner 相当を暫定流用）。Bolt 3-2: `store-list.tsx`・`compare-table.tsx` に強調表示（バッジ）を反映し実機確認済み |
| UoW-4 | 懸念タグ・推奨理由・AI 質問応答例 | 完了 | 4-2 | [docs/plans/uow-4-plan.md](plans/uow-4-plan.md) | Bolt 4-1: `Store` 型を `concernTags: string[]` / `recommendationReason: string` に移行し、スキーマテストを追加。Bolt 4-2: `ConcernTags` コンポーネント（ホバー不要で常時表示）を新設し `store-list.tsx`・新規 `/stores/:storeId` 詳細画面に反映、`buildStoreQA` で断定表現を避けたAI質問応答例を実装 |
| UoW-5 | 最終候補の説明文面 | 完了 | 5-1 | [docs/plans/uow-5-plan.md](plans/uow-5-plan.md) | Bolt 5-1: `app/utils/final-candidate-message.ts` に `buildFinalStoreMessage` を実装（`{ reason, checksBeforeBooking }` を返す構造化データ）。相手種別の重視観点（`getEmphasisKeys`）を推薦理由の冒頭に加え、懸念タグと「空席・予約成立を断定しない」定型確認事項を `checksBeforeBooking` に含める。`final-store-panel.tsx` に「この店舗を選んだ理由」「予約前の確認事項」セクションを追加し、`compare-screen.tsx` から `counterpartId`・`priorities` を渡すよう変更 |
| UoW-6 | ドメインデータモデルの再構成 | 計画済み | 未着手 | [docs/plans/uow-6-plan.md](plans/uow-6-plan.md) | UoW-3, 4, 5 完了後に着手 |
| UoW-7 | 検索・空席・AI 生成の実接続 | 計画済み | 未着手 | [docs/plans/uow-7-plan.md](plans/uow-7-plan.md) | UoW-6 完了後に着手。外部 I/F 未確定 |

## 更新履歴

| 日付 | 内容 |
|---|---|
| 2026-07-05 | UoW-0（テスト基盤導入）を完了。UoW-1〜7 の実装計画を作成し「計画済み」に更新。本ファイルを新規作成。 |
| 2026-07-05 | UoW-1（プロダクト言葉遣い・状態の一貫性）を完了。`booking-context` の状態受け渡しテストを追加、`docs/DESIGN.md` に用語対応表を追加し、`/` `/hearing` `/results` `/compare` を一気通貫で実機確認。`pnpm test` / `pnpm run typecheck` / `pnpm build` すべて green。 |
| 2026-07-05 | UoW-2（比較フローの分かりやすさ・可逆性）を完了。`toggleCompare` のトグル挙動テストと `CompareScreen` の0/1/5件境界状態テストを追加。実機確認（`/results` ⇄ `/compare` の往復、0/1/5件の表示）で、5件比較時に画面幅が狭いと比較表がはみ出して2店舗分の列が見えなくなる崩れを発見し、`compare-table.tsx` を `overflow-x-auto` + 列の `minmax(150px, 1fr)` に修正。`pnpm test` / `pnpm run typecheck` / `pnpm build` すべて green。 |
| 2026-07-05 | UoW-3（相手種別に応じた評価の重み付け）を完了。`COUNTERPARTS`5種→強調3パターンの対応を確定（exec→room/prestige/service、partner・boss・thanks・bond→quiet/access）し、`Store` 型に予算フィールドが無いため boss の「予算」強調は見送り（UoW-6 で対応予定）と決定。`app/utils/scoring.ts` の `getEmphasisKeys` にテストを追加、`store-list.tsx`・`compare-table.tsx` に強調バッジ（「重視」表示）を追加。`/hearing` で重要顧客を選択→`/results`→`/compare` の実機確認で、個室・格式・接客にバッジが付くことを確認。`pnpm test`（21件）/ `pnpm run typecheck` / `pnpm build` すべて green。 |
| 2026-07-05 | UoW-4（懸念タグ・推奨理由・AI 質問応答例）を完了。`Store` 型の `concern: string` を `concernTags: string[]`（空配列可）と `recommendationReason: string` に置き換え、6件のモックデータを移行（`app/mocks/data.test.ts` でスキーマ検証）。懸念をホバーなしで常時表示する `ConcernTags`（`app/components/ui/concern-tags.tsx`）を新設し `store-list.tsx` に反映、コンポーネントテストで DOM 常時存在を確認。店舗詳細ルート `/stores/:storeId`（`app/routes/_layout.stores.$storeId.tsx` → `StoreDetailScreen`）を新規実装し、推奨理由・懸念タグ・AI 質問応答例（`app/utils/store-qa.ts` の `buildStoreQA`、空席・予約成立を断定しないことをテストで担保）を表示。`compare-table.tsx` の懸念点行も `concernTags` に対応。`/results`（詳細リンク・懸念常時表示）→ `/stores/:storeId`（推奨理由・Q&A）→ `/compare`（懸念点行）を実機確認。`pnpm test`（31件）/ `pnpm run typecheck` / `pnpm build` すべて green。 |
| 2026-07-05 | UoW-5（最終候補の説明文面）を完了。純粋関数 `buildFinalStoreMessage`（`app/utils/final-candidate-message.ts`）を新規実装し、`recommendationReason` と相手種別の重視観点（`getEmphasisKeys`）を組み合わせた推薦理由、懸念タグ＋断定しない定型文からなる `checksBeforeBooking` を構造化データとして返す。`FinalStorePanel` に「この店舗を選んだ理由」「予約前の確認事項」を追加し、`CompareScreen` から `counterpartId`・`priorities` を受け渡すよう変更。`/hearing`（重要顧客選択）→`/results`→`/compare` で2件比較→最終候補選択の一気通貫を実機確認し、推薦理由冒頭に「個室・格式・接客」が反映され、確認事項に空席・予約成立を断定しない文言が表示されることを確認。`pnpm test`（37件）/ `pnpm run typecheck` / `pnpm build` すべて green。 |
