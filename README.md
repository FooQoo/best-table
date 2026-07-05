# Best Table

接待・会食向けのレストラン比較を AI で支援する React Router プロトタイプです。

プロダクト仕様やアーキテクチャは README ではなく `docs/` 配下で管理しています。詳細は [AGENTS.md](AGENTS.md) を参照してください。

- `docs/DESIGN.md`: プロダクト仕様、ユーザーフロー、画面設計
- `docs/ARCHITECTURE.md`: コード配置、状態モデル、AI 実装ルール
- `docs/PLANS.md`: 実装マイルストーン
- `docs/RELIABILITY.md`: AI の根拠付け、キャッシュ、障害時の振る舞い
- `docs/SECURITY.md`: センシティブ入力、プロンプトインジェクション対策

## セットアップ

```bash
pnpm install
pnpm dev
```

`http://localhost:5173` で起動します。

## 検証

```bash
pnpm run typecheck
pnpm build
```
