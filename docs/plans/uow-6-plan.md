# UoW-6 実装計画: ドメインデータモデルの再構成

## 現状分析

- `app/domain/models/` ディレクトリは存在するがファイルは空。ドメインモデルは `docs/MODEL.md` に
  設計としてのみ存在し、実装はまだ `app/mocks/data.ts` の `Store` 型に平坦に同居している
  （生の店舗情報と AI 派生評価が未分離）。
- UoW-3（重み付け）・UoW-4（懸念タグ・推奨理由）・UoW-5（最終候補説明文）が、それぞれ
  `app/utils/` に暫定的な純粋関数として実装されている想定。UoW-6 はこれらの出力形状を見た上で、
  最終的なドメイン型に正式化する。

## 実装方針

- `docs/MODEL.md` の定義に沿って、`app/domain/models/` 配下に以下を新設する:
  - 生の店舗情報（`RawStore` 相当）
  - AI 派生評価（`StoreAiEvaluation` 相当、根拠カテゴリ: 口コミ・写真・席・メニュー・アクセス・
    店舗紹介文、`confidence`, `generatedAt` を含む）
- `app/mocks/data.ts` の `STORES` を上記2型の組み合わせに変換するアダプタ関数を用意し、
  UoW-1〜5 で作った UI コンポーネントの props はなるべく変えずに済むようにする。
- 変更するファイル一覧:
  - 新規: `app/domain/models/store.ts`, `app/domain/models/ai-evaluation.ts`
  - 新規: `app/domain/models/*.test.ts`
  - `app/mocks/data.ts` — 型分離、既存 UI 向けアダプタ関数の追加
  - 影響範囲の再 typecheck: `app/components/feature/results/*`, `app/components/feature/compare/*`

## Bolt 順序と Red/Green/Verify

`docs/UNIT_OF_WORK.md` の UoW-6 節（Bolt 6-1, 6-2, 6-3）のとおり。

## リスク・懸念

- 依存元（UoW-3, 4, 5）で決めた暫定データ形状と、`docs/MODEL.md` の正式なドメインモデルの間に
  ギャップがある可能性が高い。UoW-6 着手時に両者を突き合わせ、ギャップは
  `docs/MODEL.md` 側 or 本計画のどちらを更新するか明示してから Green に進む。
- 型分離により UoW-1〜5 で作った UI コンポーネントの props が壊れる場合、アダプタ関数で
  吸収し、UI 側の変更は最小限にする。

## 完了の定義

- `docs/UNIT_OF_WORK.md` の UoW-6 Verify（型定義差分、根拠カテゴリ表示、データ不足時の表現確認）を満たす。
