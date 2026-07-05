# UoW-0 実装計画: テスト基盤の導入

> 実施済み。実際に行った作業を記録として残す（振り返り用の実装計画）。

## 現状分析

- 導入前は `package.json` にテストランナーが存在せず、`app/**` にテストファイルもなかった。
- 構成は React Router 8（Vite 8 ベース）+ Jotai。`vite.config.ts` は `resolve.tsconfigPaths: true` で
  `~/*` エイリアスを解決している。

## 実装方針

- `reactRouter()` vite プラグインはテスト実行に不要かつ競合しうるため、Vitest 専用の
  `vitest.config.ts` を別に用意し、`@vitejs/plugin-react` + `resolve.tsconfigPaths: true` を使う。
- 環境は `jsdom`、DOM アサーションのため `@testing-library/jest-dom` をセットアップファイルで読み込む。
- 変更したファイル:
  - `package.json` — devDependencies 追加、`"test": "vitest run"` スクリプト追加
  - `vitest.config.ts` — 新規
  - `vitest.setup.ts` — 新規
  - `tsconfig.json` — `types` に `vitest/globals`, `@testing-library/jest-dom` を追加（`describe`/`it`/`expect` をグローバル解決するため）
  - `app/state/booking-context.test.tsx` — サンプル兼最初のユニットテスト

## Bolt 順序と Red/Green/Verify

このユニットはテスト基盤そのものの導入のため、Red は「サンプルテストが書けること」に対応する。
`app/state/booking-context.test.tsx` を書いて `pnpm test` が実行・green になることを Green/Verify とした。

## リスク・懸念

- `reactRouter()` プラグインを vitest.config.ts に混ぜると型生成やルーティング解決でテスト起動が
  不安定になる可能性があったため、専用 config で分離した。
- `tsconfig.json` の `types` にテスト用の型を足したことで、アプリ本体のビルドに影響しないことを
  `pnpm build` で確認済み。

## 完了の定義

- `pnpm test` が green（実績: 4 tests passed）
- `pnpm run typecheck` がエラーなし（実績: 確認済み）
- `pnpm build` が成功（実績: 確認済み）
