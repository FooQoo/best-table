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

`docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の UoW-6 節（Bolt 6-1, 6-2, 6-3）のとおり。

## リスク・懸念（着手時に判明したギャップと解消方針）

着手前に `docs/MODEL.md` / `docs/ARCHITECTURE.md` と UoW-1〜5 の実装を突き合わせた結果、
2点のギャップが見つかった。いずれも `docs/MODEL.md`（ドメインモデルの正）を基準に解消する。

1. **生データ/AI評価の分離について**: 本計画は当初「`RawStore` / `StoreAiEvaluation` の2型に分離する」
   としていたが、`docs/MODEL.md`（74-86行目）・`docs/ARCHITECTURE.md`（196行目）はすでに
   「店舗候補は Google マップによるグラウンディングと AI 評価をまとめて一度に生成するため、型を分離しない」
   という明示的な設計判断を記載済みだった。UoW-6 は分離をやめ、`docs/MODEL.md` の `Restaurant` 型
   （単一のフラット型）をそのまま `app/domain/models/restaurant.ts` に実装する。本計画の「実装方針」
   と `docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の UoW-6 責務文中「分離する」という記述はこの判断で上書きする。
2. **懸念（concern）の形について**: `docs/MODEL.md`（134行目）は当初 `concern: { text, evidence } | null`
   （単数・nullable）としていたが、UoW-4 で実装済みの `concernTags: string[]`（複数・常時表示、
   ホバー非依存というガードレールを満たすため）と形が異なる。UoW-4 の複数懸念表示は既に実機確認済みの
   検証済み UX のため、`docs/MODEL.md` 側を更新し、`Restaurant.concern` を
   `concerns: { text: string; evidence: EvidenceCategory[] }[]`（配列、0件可）に変更する。
   これにより「懸念ごとに根拠カテゴリを持たせる」という UoW-6 の目的（Bolt 6-2）も満たせる。
3. **`budgetLabel` の追加**: `docs/STATUS.md` の UoW-3 完了メモで「`Store` 型に予算フィールドが無いため
   boss の『予算』強調を見送り、UoW-6 で対応」と明記されている。本 UoW で `budgetLabel` フィールドを
   追加し、`getEmphasisKeys("boss")` に `"budget"` を含める。`docs/ARCHITECTURE.md`（196行目）が
   比較表・カードの表示項目として「予算」を挙げているため、UI（`store-list.tsx` / `compare-table.tsx`）
   にも表示を追加する。
4. **`location` / `photoUrl` は実データ未接続のため `null` のまま**: 実緯度経度・実写真取得は
   UoW-7（検索・空席・AI 生成の実接続）の責務。UoW-6 では型として `location: {lat,lng}|null` /
   `photoUrl: string|null` を定義するに留め、値は全モックで `null` にする。既存のプロトタイプ用
   相対配置（`pos: {top,left}`）とプレースホルダーラベル（`photoPlaceholderLabel`）は `Restaurant` を
   拡張したモック専用の `Store` 型に残し、UI の変更を最小限にする
   （`Store = Restaurant & { pos; photoPlaceholderLabel }`）。

型分離により UoW-1〜5 で作った UI コンポーネントの props が壊れる場合、アダプタ関数や上記の
モック専用拡張フィールドで吸収し、UI 側の変更は最小限にする。

## 完了の定義

- `docs/plans/mvp-cycle-1/UNIT_OF_WORK.md` の UoW-6 Verify（型定義差分、根拠カテゴリ表示、データ不足時の表現確認）を満たす。
- 上記ギャップ解消により更新した `docs/MODEL.md` の記述が、実装（`app/domain/models/restaurant.ts`）と一致する。
