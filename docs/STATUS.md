# 開発状況

現行サイクルの `UNIT_OF_WORK.md` で定義した Unit of Work（UoW）ごとの進捗を管理する。
実装を進めるたびに、このファイルの該当行と「現在地」を更新する。

## 現在地

- **現行サイクル**: `docs/plans/mvp-cycle-3/`
- **着手中の UoW**: なし（mvp-cycle-3 完了）
- **次のアクション**: 次サイクルを開始する場合は `docs/plans/` 配下に新しいサイクル計画を作成する。

## ステータス一覧

状態は次のいずれかで管理する。

- `未着手`: `UNIT_OF_WORK.md` に未登録、または対象サイクルでまだ扱わない
- `計画済み`: `UNIT_OF_WORK.md` に登録済み。実装計画（`docs/plans/<cycle>/uow-N-plan.md`）は着手直前に作成する
- `進行中`: いずれかの Bolt が Red/Green/Verify の途中
- `完了`: すべての Bolt が Verify まで通過、対象サイクルの `UNIT_OF_WORK.md` の完了条件を満たした

| サイクル | UoW | タイトル | 状態 | 直近の Bolt | 実装計画 | 備考 |
|---|---|---|---|---|---|---|
| mvp-cycle-1 | UoW-0 | テスト基盤の導入 | 完了 | - | [docs/plans/mvp-cycle-1/uow-0-plan.md](plans/mvp-cycle-1/uow-0-plan.md) | Vitest + Testing Library 導入、`pnpm test` green、typecheck/build 確認済み |
| mvp-cycle-1 | UoW-1 | プロダクト言葉遣い・状態の一貫性 | 完了 | 1-2 | [docs/plans/mvp-cycle-1/uow-1-plan.md](plans/mvp-cycle-1/uow-1-plan.md) | Bolt 1-1: 状態受け渡しテスト追加（既存実装で green）。Bolt 1-2: `docs/DESIGN.md` に用語対応表を追加、4画面を実機確認し表記ゆれなしを確認済み |
| mvp-cycle-1 | UoW-2 | 比較フローの分かりやすさ・可逆性 | 完了 | 2-2 | [docs/plans/mvp-cycle-1/uow-2-plan.md](plans/mvp-cycle-1/uow-2-plan.md) | Bolt 2-1: `toggleCompare` のトグル挙動（追加・削除）テストを追加。Bolt 2-2: 0/1/5件の境界状態テストを追加し、実機確認で5件表示時に狭い画面幅で比較表がはみ出し列が見えなくなる崩れを発見・修正（`overflow-hidden`→`overflow-x-auto`、列に`minmax(150px,1fr)`を指定） |
| mvp-cycle-1 | UoW-3 | 相手種別に応じた評価の重み付け | 完了 | 3-2 | [docs/plans/mvp-cycle-1/uow-3-plan.md](plans/mvp-cycle-1/uow-3-plan.md) | Bolt 3-1: `app/utils/scoring.ts` に `getEmphasisKeys` を実装（exec→room/prestige/service、partner・boss→quiet/access、thanks/bond は partner 相当を暫定流用）。Bolt 3-2: `store-list.tsx`・`compare-table.tsx` に強調表示（バッジ）を反映し実機確認済み |
| mvp-cycle-1 | UoW-4 | 懸念タグ・推奨理由・AI 質問応答例 | 完了 | 4-2 | [docs/plans/mvp-cycle-1/uow-4-plan.md](plans/mvp-cycle-1/uow-4-plan.md) | Bolt 4-1: `Store` 型を `concernTags: string[]` / `recommendationReason: string` に移行し、スキーマテストを追加。Bolt 4-2: `ConcernTags` コンポーネント（ホバー不要で常時表示）を新設し `store-list.tsx`・新規 `/stores/:storeId` 詳細画面に反映、`buildStoreQA` で断定表現を避けたAI質問応答例を実装 |
| mvp-cycle-1 | UoW-5 | 最終候補の説明文面 | 完了 | 5-1 | [docs/plans/mvp-cycle-1/uow-5-plan.md](plans/mvp-cycle-1/uow-5-plan.md) | Bolt 5-1: `app/utils/final-candidate-message.ts` に `buildFinalStoreMessage` を実装（`{ reason, checksBeforeBooking }` を返す構造化データ）。相手種別の重視観点（`getEmphasisKeys`）を推薦理由の冒頭に加え、懸念タグと「空席・予約成立を断定しない」定型確認事項を `checksBeforeBooking` に含める。`final-store-panel.tsx` に「この店舗を選んだ理由」「予約前の確認事項」セクションを追加し、`compare-screen.tsx` から `counterpartId`・`priorities` を渡すよう変更 |
| mvp-cycle-1 | UoW-6 | ドメインデータモデルの再構成 | 完了 | 6-3 | [docs/plans/mvp-cycle-1/uow-6-plan.md](plans/mvp-cycle-1/uow-6-plan.md) | `app/domain/models/restaurant.ts` に `docs/MODEL.md` 準拠の単一 `Restaurant` 型を実装（生データとAI評価は分離しない設計に合わせ本計画を修正）。`concern` は UoW-4 の複数懸念表示を維持するため `concerns: ConcernItem[]` に変更し `docs/MODEL.md`/`docs/ARCHITECTURE.md` を更新。`budgetLabel` を追加し boss の「予算」強調を解消。`app/mocks/data.ts` の `STORES` を全フィールド移行、`app/domain/services/restaurant-cache-policy.ts` にキャッシュキー生成・鮮度判定を実装 |
| mvp-cycle-1 | UoW-7 | 検索・空席・AI 生成の実接続 | 完了 | 7-3 | [docs/plans/mvp-cycle-1/uow-7-plan.md](plans/mvp-cycle-1/uow-7-plan.md) | Bolt 7-1: `@ai-sdk/google`・`ai`・zod・`@vis.gl/react-google-maps` を導入し、Google マップによるグラウンディング、構造化評価、検索オーケストレーション、resource route を実装。Bolt 7-2: 実予約 API には接続せず、空席状況の留保表現を一本化。Bolt 7-3: 店舗詳細のオンデマンド質問応答を実装 |
| mvp-cycle-2 | UoW-1 | Places 店舗データ解決と mock mode | 完了 | 1-3 | [docs/plans/mvp-cycle-2/uow-1-plan.md](plans/mvp-cycle-2/uow-1-plan.md) | Bolt 1-1: mock mode の地図用モックに座標・住所・代表写真・mock placeId を付与。Bolt 1-2: Places Details の FieldMask と変換境界を実装。Bolt 1-3: 検索オーケストレーションへ先頭10件の Places 解決を接続し、失敗時も候補を落とさない挙動を固定 |
| mvp-cycle-2 | UoW-2 | 10件単位の取得・追加読み込み・スケルトン | 完了 | 2-3 | [docs/plans/mvp-cycle-2/uow-2-plan.md](plans/mvp-cycle-2/uow-2-plan.md) | API 契約を `limit` / `offset` / `hasMore` / `nextOffset` に拡張し、初回10件・追加10件を追記。初回/追加スケルトン、再試行導線、IntersectionObserver sentinel、重複取得防止を実装 |
| mvp-cycle-2 | UoW-3 | 検索結果地図 | 完了 | 3-3 | [docs/plans/mvp-cycle-2/uow-3-plan.md](plans/mvp-cycle-2/uow-3-plan.md) | `@vis.gl/react-google-maps` の共通地図部品を追加し、`/results` の右側 MAP を実地図へ置き換え。座標あり店舗のみマーカー表示、key 未設定/座標なし時のフォールバック、カード hover/focus とマーカー click の active 連動を実装 |
| mvp-cycle-2 | UoW-4 | 最終候補地図と Google Maps 導線 | 完了 | 4-3 | [docs/plans/mvp-cycle-2/uow-4-plan.md](plans/mvp-cycle-2/uow-4-plan.md) | 最終候補パネルの地図を共通 `RestaurantMap` に差し替え。座標なし時は「地図情報なし」とし、Google Map URL 生成を `buildGoogleMapsUrl` に切り出して `placeId` 優先・住所/エリア検索フォールバックを実装 |
| mvp-cycle-3 | UoW-1 | 地図内 AI チャット UI | 完了 | 1-3 | [docs/plans/mvp-cycle-3/uow-1-plan.md](plans/mvp-cycle-3/uow-1-plan.md) | `ResultsAiChat` を `/results` の地図右下に追加。右スライドパネル、初回 FAQ、長文入力、Enter 送信 / Shift+Enter 改行、店舗詳細パネルを閉じないクリック判定を実装 |
| mvp-cycle-3 | UoW-2 | 地図コンテキスト AI 相談 API | 完了 | 2-3 | [docs/plans/mvp-cycle-3/uow-2-plan.md](plans/mvp-cycle-3/uow-2-plan.md) | `/api/results/chat`、`results-chat-prompt.ts`、`gemini-results-chat.ts` を追加。表示中 `Restaurant[]` とヒアリング条件を検証し、text stream で回答。失敗はチャット内だけに表示 |
| mvp-cycle-3 | UoW-3 | 次のおすすめ質問 | 完了 | 3-3 | [docs/plans/mvp-cycle-3/uow-3-plan.md](plans/mvp-cycle-3/uow-3-plan.md) | `results-chat-suggestions.ts` で回答後4件のおすすめ質問を deterministic に生成。相手種別・重視条件・直前質問を反映し、空席確定・予約成立へ誘導しない文言をテストで固定 |
| mvp-cycle-3 | UoW-4 | 単一店舗詳細ページ・質問 API の廃止 | 完了 | 4-3 | [docs/plans/mvp-cycle-3/uow-4-plan.md](plans/mvp-cycle-3/uow-4-plan.md) | `/stores/:storeId`、`/api/stores/:storeId/ask`、`StoreDetailScreen`、`StoreAskPanel`、単一店舗 Q&A 専用 client/service を削除。詳細は `/results` 内パネル、AI 相談は地図チャットへ集約 |

## 更新履歴

| 日付 | 内容 |
|---|---|
| 2026-07-05 | 新サイクル `mvp-cycle-3`（地図コンテキスト AI チャット、単一店舗詳細ページ・質問 API の廃止）を計画。mock UI レビューで右スライドパネル方針を採用し、`docs/plans/mvp-cycle-3/PLANS.md` と `UNIT_OF_WORK.md` を作成、UoW-1〜4 を「計画済み」として追加。 |
| 2026-07-05 | mvp-cycle-3 UoW-1〜4 の実装計画書（`uow-1-plan.md` / `uow-2-plan.md` / `uow-3-plan.md` / `uow-4-plan.md`）を作成。実装には入らず、各 UoW の現状分析・変更ファイル・Bolt 順序・リスク・完了条件を整理。 |
| 2026-07-05 | mvp-cycle-3 UoW-1〜4 を実装完了。地図内 AI チャット UI、`/api/results/chat`、回答後おすすめ質問、旧単一店舗詳細ページ・質問 API 廃止を反映し、`pnpm test` / `pnpm run typecheck` / `pnpm build` を確認。 |
