# Unit of Work 分解（AWS AI-DLC 形式）

`docs/plans/mvp-cycle-6/PLANS.md` のマイルストーンを、AWS AI-DLC（AI-Driven Development Life Cycle）の
Inception フェーズで生成される成果物の形式に合わせて Unit of Work（UoW）へ分解したものです。

構成は AI-DLC の `inception/application-design/` 配下の3成果物に対応しています。

- Unit of Work 定義（責務・スコープ）
- 依存関係マトリクス
- ストーリーマップ（`docs/plans/mvp-cycle-6/PLANS.md` のタスク・受け入れ条件との対応）

各 UoW はさらに Bolt（数時間〜数日の短サイクル）に分解します。

各 Bolt は TDD（Red → Green → Verify）で進めます。テストコードを先に書いて失敗させ（Red）、
それを満たす実装をし（Green）、最後に Quality Gates で検証する（Verify）流れです。

**現在の進捗は [`docs/STATUS.md`](../../STATUS.md) で管理する。** 各 UoW が「未着手／計画済み／進行中／完了」の
どこにいるかは、このファイルではなく `docs/STATUS.md` を正とする。Bolt を1つ進めるごとに
`docs/STATUS.md` の該当行と「現在地」を更新する。

**各 UoW は着手前に必ず実装計画（`docs/plans/mvp-cycle-6/uow-N-plan.md`）を作成する。**
定義・依存関係・Bolt 分解が決まっていても、実際のコードベースの現状を踏まえた計画を書いてから
Red に入ることで、手戻りと見落としを防ぐ。テンプレートは [`docs/plans/TEMPLATE.md`](../TEMPLATE.md)、
各 UoW の計画は本ファイルと同じ [`docs/plans/mvp-cycle-6/`](.) 配下に置く（本フェーズでは事前生成しない）。

このサイクル（`mvp-cycle-6`）は `docs/plans/mvp-cycle-6/PLANS.md` のマイルストーン1〜2に対応する。

## 前提: モック UI での既実装

`PLANS.md` の Phase 4（モック UI）で、送客リンク UI の見た目部分は先行実装済み。

- `Restaurant.ikyu?: IkyuReferral | null`（`app/domain/models/restaurant.ts`。現状 optional）
- `app/mocks/data.ts` の `STORES` のうち3件に手書きの `ikyu` を付与
- `StoreList`（一覧カード）の「一休.com掲載」バッジ
- `StoreDetailPanel`（詳細パネル）の「一休.comで空席を確認」リンク、「Google Mapで空席・予約を確認」への改称
- `ComparePanel`（比較サイドパネル）の店舗列ごとの「一休.comで空席を確認」リンク、同改称

以降の UoW は、この見た目を「実際に一休掲載店マスタと照合して `ikyu` を導出する」パイプラインに接続する作業が中心になる。UI コード自体の大きな変更は伴わない想定。

---

## 1. Unit of Work 定義

### UoW-1: 一休掲載店マスタ repository

- **責務**: 一休掲載店マスタ（店舗詳細ページ URL と照合用属性の一覧）を保持する型と、それを取得する repository を用意する。このサイクルではモック fixture を読むだけの実装とし、将来の提携データ・API に差し替え可能なインターフェースにする。
- **対象領域**: `app/domain/models/`（`IkyuListing` 型）、`app/server/repositories/`（`ikyu-listing-repository.ts`）、`app/mocks/fixtures/`（一休掲載店マスタ fixture）
- **スコープ外**: real データ接続（バリューコマース提携等）、店舗同定ロジック自体（UoW-2）。
- **依存**: なし
- **出力**: `IkyuListingRepository`（`list(): Promise<IkyuListing[]>` 相当のインターフェース）、モック実装、少数（5件程度）の手動記録 fixture。読み込み失敗時は空配列を返す。
- **元マイルストーン**: マイルストーン1（一休掲載店マスタの用意）。

### UoW-2: 店舗同定（照合）ロジック

- **責務**: 施設検索で得た候補（`placeId`・電話番号・店名・住所）と一休掲載店マスタの各エントリを照合し、一致した候補に `IkyuReferral` を返す純粋関数を実装する。照合キーの優先順は `placeId` → 電話番号（正規化） → 店名+住所。矛盾する場合は一致とみなさない。
- **対象領域**: `app/domain/services/`（外部 I/O を持たない純粋関数。Client/Server 両方から参照可能な置き場所という既存方針に合わせる）
- **スコープ外**: repository からの読み出し（UoW-1 で完了済み）、検索パイプラインへの組み込み（UoW-3）。
- **依存**: UoW-1（`IkyuListing` 型を使う）
- **出力**: `matchIkyuListing(candidate, listings): IkyuReferral | null` 相当の純粋関数と単体テスト。
- **元マイルストーン**: マイルストーン1（店舗同定の仕組み）。

### UoW-3: 検索パイプラインへの統合

- **責務**: `streamRestaurants`（`app/server/services/restaurant-search.ts`）で、施設検索の直後・AI 評価の前に UoW-2 の照合を行い、`restaurant` イベント送出時点で `Restaurant.ikyu` を確定させる。マスタ読み込み失敗時は全候補 `ikyu: null` として検索自体は継続する。非ストリーム版 `/api/restaurants/search` にも同様に適用する。
- **対象領域**: `app/server/services/restaurant-search.ts`、`app/routes/api.restaurants.search.stream.tsx`、`app/routes/api.restaurants.search.tsx`
- **スコープ外**: AI 評価ロジック自体の変更、候補の絞り込み（絞り込みは行わない）。
- **依存**: UoW-1, UoW-2
- **出力**: 施設検索候補すべてに `ikyu`（一致 or `null`）が付与された状態で後続（AI 評価・画面表示）に流れる。`Restaurant.ikyu` を optional から必須（`IkyuReferral | null`）に変更し、`isRestaurant` の検証も合わせて更新する。
- **元マイルストーン**: マイルストーン1（検索パイプラインへの組み込み）。

### UoW-4: 送客リンク UI の実データ接続と境界確認

- **責務**: モック UI 段階で実装済みの「一休.com掲載」バッジ・「一休.comで空席を確認」リンクが、UoW-3 で流れてくる実際の `ikyu`（照合結果）に対して正しく出し分けられることを確認・固定する。あわせて `app/mocks/data.ts` の手書き `ikyu`（UI 確認専用のダミー値）と、real パイプライン由来の `ikyu` が混同されないことを明確にする。
- **対象領域**: `app/components/feature/results/store-list.tsx`, `store-detail-panel.tsx`, `compare-panel.tsx`（既存実装の確認・必要なら微修正）
- **スコープ外**: 新しい UI 要素の追加、文言の再変更。
- **依存**: UoW-3
- **出力**: `ikyu` が `null` の店舗でリンク・バッジが出ないこと、`ikyu` がある店舗で一休 URL がマスタ由来のまま描画されることを担保するコンポーネントテスト。
- **元マイルストーン**: マイルストーン2（送客リンク UI）。

---

## 2. 依存関係マトリクス

| Unit of Work | 依存先 | 並行実行可否 |
|---|---|---|
| UoW-1 一休掲載店マスタ repository | なし | 最初に着手 |
| UoW-2 店舗同定（照合）ロジック | UoW-1 | 単独 |
| UoW-3 検索パイプラインへの統合 | UoW-1, UoW-2 | 単独（後続の前提になるため直列） |
| UoW-4 送客リンク UI の実データ接続と境界確認 | UoW-3 | 最終フェーズ |

```
UoW-1 ──→ UoW-2 ──→ UoW-3 ──→ UoW-4
```

---

## 3. ストーリーマップ（PLANS.md 対応表）

| Unit of Work | 対応する `docs/plans/mvp-cycle-6/PLANS.md` の受け入れ条件 |
|---|---|
| UoW-1 | 一休掲載店マスタが repository 境界で分離され、将来の提携データ・API に差し替え可能な状態になる |
| UoW-2 | 送客 URL がマスタ由来（一休）に限定され、AI 生成・自由文字列由来の URL が存在しない |
| UoW-3 | 一休掲載店マスタに照合できた店舗は `ikyu.url` を持ち、照合できない店舗は `ikyu: null` のまま一覧・地図・比較に表示され続ける／マスタ読み込み失敗時も検索・比較・ナビゲーションが使える |
| UoW-4 | 店舗詳細パネルと比較サイドパネルから、一休掲載店は一休.comの店舗詳細ページを新しいタブで開ける／一休掲載店でない店舗は一休リンクが表示されず「Google Mapで空席・予約を確認」だけが表示される／「この店に決める」等の確定操作・最終候補パネルは存在しないままである |

---

## 4. Bolt 分解と TDD サイクル（Red → Green → Verify）

共通 Verify（全 UoW 共通・`AGENTS.md` 準拠）:
- `pnpm test`
- `pnpm run typecheck`
- `pnpm build`
- `/results`（比較サイドパネルの開閉を含む）を実機確認する。

### UoW-1: 一休掲載店マスタ repository

- Bolt 1-1（型定義とマスタ fixture）
  - Red: `IkyuListing`（店舗詳細ページ URL、照合用の店名・電話番号・placeId・住所）の形状を検証する `isIkyuListing` 相当のテストを先に書く。
  - Green: `app/domain/models/ikyu-listing.ts`（型・検証関数）と `app/mocks/fixtures/ikyu-listings.json`（5件程度、実在店の一休詳細ページ URL を手動記録。`.gitignore` 対象にするかは既存の `restaurants-search.json` 運用に合わせて判断する）を実装する。
  - Verify: `pnpm test`（該当ファイル）。
- Bolt 1-2（repository）
  - Red: `IkyuListingRepository.list()` がモック fixture を読み、壊れている・存在しない場合は空配列を返すことをテストとして先に書く（`restaurant-search-repository.test.ts` の `loadMockRestaurants` 相当のパターンを踏襲）。
  - Green: `app/server/repositories/ikyu-listing-repository.ts` を実装する。
  - Verify: `pnpm test` + 共通 Verify。
- 完了の証拠: `pnpm test` ログ、fixture ファイルの内容、repository の失敗時フォールバック確認。

### UoW-2: 店舗同定（照合）ロジック

- Bolt 2-1（照合ロジック）
  - Red: `matchIkyuListing` に対し、次のケースのテストを先に書く。
    - `placeId` が一致 → `matchedBy: "placeId"` で一致
    - `placeId` は無いが電話番号（正規化後）が一致 → `matchedBy: "phone"`
    - 電話番号も無いが店名+住所が一致 → `matchedBy: "name-address"`
    - どのキーも一致しない → `null`
    - 複数キーが矛盾する（例: 電話番号は一致するが店名が明らかに別店舗） → `null`
  - Green: `app/domain/services/ikyu-matching.ts` に純粋関数として実装する。
  - Verify: `pnpm test`。
- 完了の証拠: `pnpm test` ログ、照合ケース一覧のテスト結果。

### UoW-3: 検索パイプラインへの統合

- Bolt 3-1（`Restaurant.ikyu` の必須化）
  - Red: `isRestaurant` が `ikyu: null` を許可し、`ikyu` フィールド自体が欠落したオブジェクトを拒否する（optional から必須への変更）ことをテストとして先に書く。既存の mock データ（`app/mocks/data.ts`）・fixture・テストフィクスチャが全て `ikyu` を明示的に持つよう更新が必要になる点を洗い出す。
  - Green: `app/domain/models/restaurant.ts` の `ikyu` を必須化し、影響するモック・テストフィクスチャを更新する。
  - Verify: `pnpm test` + `pnpm run typecheck`。
- Bolt 3-2（パイプライン組み込み）
  - Red: `streamRestaurants` が施設検索直後に UoW-2 の照合を行い、`restaurant` イベントの `restaurant.ikyu` に照合結果（または `null`）が入ることをテストとして先に書く。マスタ読み込み失敗時は全件 `ikyu: null` で継続することも合わせてテストする。
  - Green: `app/server/services/restaurant-search.ts`（および非ストリーム版のパスがあれば同様に）へ組み込む。
  - Verify: `pnpm test` + `/results` を mock mode / real mode 双方で実機確認し、一休掲載店バッジ・リンクの出方を目視確認。
- 完了の証拠: `pnpm test` ログ、`/results` の実機確認結果（一休掲載店・非掲載店それぞれのカード）。

### UoW-4: 送客リンク UI の実データ接続と境界確認

- Bolt 4-1（表示の境界テスト）
  - Red: `ikyu` が `null` の店舗で「一休.com掲載」バッジ・「一休.comで空席を確認」リンクが DOM に存在しないこと、`ikyu` がある店舗で `href` がマスタ由来の URL と一致することを、`store-list.test.tsx` / `store-detail-panel.test.tsx` / `compare-panel.test.tsx` に追加する形でテストを先に書く（既存テストに `ikyu: null` のケースが無ければ追加する）。
  - Green: 既存コンポーネントの実装を必要な範囲で微修正する（多くは Bolt 3-1 の必須化に追従するだけの想定）。
  - Verify: `pnpm test` + `pnpm run typecheck` + `pnpm build` + `/results` の実機確認（比較サイドパネルの開閉を含む）。
- 完了の証拠: `pnpm test` ログ、`/results` の実機確認スクリーンショット（一休掲載店・非掲載店の両方を含む比較表）。
