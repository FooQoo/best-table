# UoW-3 実装計画: 相手種別に応じた評価の重み付け

## 現状分析

- `app/mocks/data.ts` の `COUNTERPARTS` に相手種別のマスタ（id/label/desc）が既にある
  （`exec`, `partner`, `boss`, `thanks`, `bond`）。
- `Store` 型（同ファイル）は `room`, `quiet`, `prestige`, `service`, `access`, `concern` を持つが、
  相手種別ごとの重み付けロジックは未実装（現状は `score` 固定値のみ）。
- 表示側は `app/components/feature/results/store-list.tsx` と
  `app/components/feature/compare/compare-table.tsx`。

## 実装方針

- 純粋関数 `scoreForCounterpart(store, counterpartId)` を新規実装し、相手種別に応じて
  どの項目（room/quiet/prestige/service/access）を強調するかを返す。
- `docs/PLANS.md` の受け入れ条件に合わせて対応表を先に固定する:
  - `exec`（重要顧客）→ room, prestige, service
  - `partner`（初回取引先）→ access, quiet（会話しやすさ相当）
  - `boss`（社内上司）→ 予算, quiet, access の使いやすさ相当
  - 現状の `COUNTERPARTS` は5種類だが、`docs/PLANS.md` の受け入れ条件は3種類（重要顧客・初回取引先・
    社内上司）。`thanks`/`bond` の扱いは UoW-3 着手時に確認し、暫定で `partner` 相当の重みを流用する。
- 変更するファイル一覧:
  - 新規: `app/utils/scoring.ts` — 重み付けロジック（純粋関数）
  - 新規: `app/utils/scoring.test.ts` — Red で先に書くテスト
  - `app/components/feature/results/store-list.tsx` — 強調表示の反映
  - `app/components/feature/compare/compare-table.tsx` — 強調表示の反映

## Bolt 順序と Red/Green/Verify

`docs/UNIT_OF_WORK.md` の UoW-3 節（Bolt 3-1, 3-2）のとおり。

## リスク・懸念（着手時に確定した内容）

- `COUNTERPARTS` が5種類、受け入れ条件が3パターンという不一致があったため、次のとおり確定した
  （`app/utils/scoring.ts` の `EMPHASIS_BY_COUNTERPART` として実装）。
  - `exec`（重要顧客）→ room, prestige, service
  - `partner`（初回取引先）→ quiet, access
  - `boss`（社内上司）→ quiet, access
  - `thanks` / `bond` → 暫定で `partner` 相当（quiet, access）を流用
- `boss` の受け入れ条件は「予算・落ち着き・使いやすさ」だが、`Store` 型に予算を表す独立フィールドが
  無いため、強調表示できるのは既存のフィールド（quiet=落ち着き, access=使いやすさ）のみとした。
  結果として `partner` と `boss` の強調項目は同一になる。予算の強調は UoW-6
  （ドメインデータモデルの再構成）でフィールドを追加してから対応する。

## 完了の定義

- `docs/UNIT_OF_WORK.md` の UoW-3 Verify（`pnpm test` + 相手種別パターンごとの手動確認）を満たす。
- 完了の証拠: `pnpm test` 21件 green（`app/utils/scoring.test.ts` 7件、`store-list.test.tsx` 2件、
  `compare-table.test.tsx` 2件を含む）。`pnpm run typecheck` / `pnpm build` green。
  `/hearing` で「重要顧客・役員クラスの接待」を選択→`/results`→`/compare` の実機確認で、
  個室・格式・接客に「重視」バッジが付き、静かさ・アクセス・懸念点には付かないことを確認。
