# Unit of Work 分解（AWS AI-DLC 形式）

`docs/plans/mvp-cycle-6/PLANS.md` のマイルストーンを、AWS AI-DLC（AI-Driven Development Life Cycle）の
Inception フェーズで生成される成果物の形式に合わせて Unit of Work（UoW）へ分解したものです。

このサイクルは単一マイルストーン（一休.com検索リンクの送客導線）の小規模実装のため、UoW は1つのみ。

**現在の進捗は [`docs/STATUS.md`](../../STATUS.md) で管理する。**

---

## 1. Unit of Work 定義

### UoW-1: 一休.com検索リンクの送客導線

- **責務**: 店舗名から一休.comの検索結果ページ URL を組み立てる純粋関数を実装し、比較サイドパネルに全店舗一律の送客リンクとして表示する。店舗詳細パネルには送客リンクを置かない。
- **対象ルート**: `/results`（店舗詳細パネル・比較サイドパネル）
- **スコープ外**: 一休掲載店マスタとの照合（店舗同定）、送客クリックの計測、Google Maps 送客リンクの変更（既存のまま）。
- **依存**: なし
- **出力**: `app/utils/ikyu-search-url.ts` の `buildIkyuSearchUrl`、`ComparePanel` への「一休.comで空席を確認」リンク（全店舗表示）と、`StoreDetailPanel` からの一休.com / Google Map 送客リンク削除。
- **元マイルストーン**: マイルストーン1（全タスク）。

---

## 2. ストーリーマップ（PLANS.md 対応表）

| Unit of Work | 対応する `docs/plans/mvp-cycle-6/PLANS.md` の受け入れ条件 |
|---|---|
| UoW-1 | 比較サイドパネルから、全店舗が一休.comの検索結果ページを新しいタブで開ける／店舗詳細パネルには一休.com・Google Mapの送客リンクが表示されない／一休.com URL は店舗名から機械的に組み立てた値のみが使われる／確定操作・最終候補パネルは存在しない |

---

## 3. Bolt 分解と TDD サイクル（Red → Green → Verify）

共通 Verify（`AGENTS.md` 準拠）:
- `pnpm test`
- `pnpm run typecheck`
- `pnpm build`
- `/results`（店舗詳細パネル・比較サイドパネルの開閉を含む）を実機確認する。

### UoW-1: 一休.com検索リンクの送客導線

- Bolt 1-1（URL 組み立て関数）
  - Red: `buildIkyuSearchUrl` が店舗名を term にした一休.com検索URL（空白は `+` エンコード）を返すことをテストとして先に書く。
  - Green: `app/utils/ikyu-search-url.ts` に実装する。
  - Verify: `pnpm test`。
- Bolt 1-2（UI 表示）
  - Red: `StoreDetailPanel`・`ComparePanel` が、店舗ごとに `buildIkyuSearchUrl` の結果を href に持つ「一休.comで空席を確認」リンクを表示することをコンポーネントテストとして先に書く。
  - Green: 両コンポーネントにリンクを実装する。
  - Verify: `pnpm test` + `/results` の実機確認（店舗詳細パネルに送客リンクがなく、比較サイドパネルで一休.comリンクが開けること）。
- 完了の証拠: `pnpm test` ログ、`/results` の実機確認スクリーンショット。
