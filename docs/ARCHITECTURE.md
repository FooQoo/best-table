# アーキテクチャ

このドキュメントは、Best Table のコード配置、実行境界、主要モジュールの責務を説明する codemap です。

目的は、変更したい内容に対して「どこを見ればよいか」「どこに置くべきか」を判断しやすくすることです。実装詳細や画面仕様は `docs/DESIGN.md`、実装順序は `docs/plans/<cycle>/PLANS.md`（サイクルごとに定義。現行サイクルは `docs/STATUS.md` を参照）に分けます。

## 技術スタック

- React Router Framework Mode
- `@react-router/fs-routes` によるファイルベースルーティング
- React 19
- TypeScript
- Jotai
- Tailwind CSS
- shadcn 風のローカル UI コンポーネント
- AI SDK (`ai` パッケージ, Vercel) + `@ai-sdk/google`（Gemini）
- Google Maps JavaScript API（React バインディング用に `@vis.gl/react-google-maps` を使用し、`/results` の地図表示へ接続済み）
- Google Places API (New) は座標・住所・代表写真の解決に使う。呼び出しはサーバー側に閉じ、10件単位に制限する。
- `react-markdown` + `remark-breaks`: 地図コンテキスト AI チャットの回答本文だけを Markdown として描画する（`app/components/feature/results/results-ai-chat.tsx`）。生 HTML は解釈しないため、`docs/SECURITY.md` の「AI 出力を生 HTML として注入しない」を満たしたまま改行・簡単な整形を表示できる。
- `html-to-image`: 比較サイドパネルの比較表を PNG 画像として保存する機能（`app/components/feature/results/compare-panel.tsx`）に使う。
- `nuqs`: トップ・ヒアリング・検索結果で指定する検索・会食条件の URL query parser / serializer に使う。React Router Framework Mode での URL 更新は `useSearchParams` で行う。`BookingRequest` 相当の条件は query から復元し、比較候補や取得済み店舗などの画面内一時状態は Jotai に残す。
- `radix-ui` / `lucide-react`: shadcn 風ローカル UI コンポーネントの基盤・アイコン。

## ルーティング設計

React Router Framework Mode で、`@react-router/fs-routes` のファイルベースルーティングを使う。

ルート設定:

- `app/routes.ts` は `flatRoutes()` を使う。
- ルートモジュールは `app/routes/` 配下に置く。
- `app/routes/` 配下のファイル名を URL とネスト構造に対応させる。
- メインのアプリ共通レイアウトは、パスなしレイアウトルート `app/routes/_layout.tsx` に置く。
- グローバルなドキュメント構造、メタ、スクリプト、プロバイダーは `app/root.tsx` の責務とする。

ファイルベースルーティング規約:

- `_layout.tsx` のように先頭 `_` のルートは URL セグメントを作らないパスなしレイアウトとして扱う。
- `_layout.hearing.tsx` のように `.` でつながるファイルは、`_layout.tsx` の子ルートとしてネストする。
- `_layout._index.tsx` は `_layout.tsx` 配下の index route として `/` に対応する。
- URL に新しい固定ページを追加する場合は、原則として `_layout.<path>.tsx` を追加する。
- 動的セグメントが必要な場合は `$` 接頭辞を使う。
- ルートモジュールには画面固有の最小限の接続だけを置き、実 UI は `app/components/feature/<area>/` に置く。
- 独立した API サーバーは置かない。AI 呼び出しを含むサーバー処理は、すべて React Router の route module（`loader` / `action`）が受け口になる。デフォルトエクスポート（UI コンポーネント）を持たない resource route も、同じファイルベースルーティング規約の上でこの API 受け口として使ってよい。
- 画面を持たない resource route は `_layout.*` ではなく `api.` プレフィックスのトップレベルルートに置く（例: `api.results.chat.tsx` -> `/api/results/chat`）。resource route はレイアウトを描画しないため `_layout` 配下に置く意味がなく、URL からも API であることが分かるようにする。

確定ルート:

| URL | ルートモジュール | 画面責務 |
| --- | --- | --- |
| `/` | `app/routes/_layout._index.tsx` | トップ / 検索入口 |
| `/hearing` | `app/routes/_layout.hearing.tsx` | 会食文脈と基本条件のヒアリング |
| `/results` | `app/routes/_layout.results.tsx` | MAP 付き検索結果、AI 評価付き店舗カード、比較追加、比較サイドパネル |

上記を実装予定の正式なパス設計とする。初期実装で画面が未完成の場合でも、追加時はこの URL とルートモジュール名に合わせる。店舗ごとの詳細情報、比較、最終候補の確定・予約導線は持たず、`/results` 内の詳細パネル・比較サイドパネルに集約する（`mvp-cycle-4` で `/compare` ルートと将来の `/reservation-handoff` ロードマップを撤回）。

画面を持たない resource route:

| URL | ルートモジュール | 状態 | 責務 |
| --- | --- | --- | --- |
| `/api/restaurants/search/stream` | `app/routes/api.restaurants.search.stream.tsx` | 実装済み | 検索条件を受け取り、Places API による施設検索＋ Gemini 構造化評価を実行して `Restaurant[]` を NDJSON（`phase` → `restaurant` を1件ずつ → `done`）で逐次返す。`/results` はこの route を `fetch` + `ReadableStream` で読み、店舗が確定するたびに1件ずつ画面へ反映する（下記「検索・評価型」参照） |
| `/api/restaurants/search` | `app/routes/api.restaurants.search.tsx` | 実装済み（非ストリーム） | 検索条件を受け取り、`Restaurant[]` をまとめて返す一括版。現在 UI からは呼ばれておらず、`app/mocks/fixtures/restaurants-search.json` フィクスチャの再生成（`pnpm dev` を起動して直接 POST する）にのみ使う |
| `/api/photos/*` | `app/routes/api.photos.$.tsx` | 実装済み | Place Photos の photo resource name を受け取り、`photo-repository.ts` 経由で画像を取得して中継する（real: サーバー専用 API キーで Google から取得、mock: 記録済みマッピングへリダイレクト） |
| `/api/results/chat` | `app/routes/api.results.chat.tsx` | 実装済み | 表示中の `Restaurant[]`、ヒアリング条件、質問文を受け取り、地図コンテキストの相談回答を返す |
| `/api/results/chat/suggestions` | `app/routes/api.results.chat.suggestions.tsx` | 実装済み | 直前の質問・回答と表示中店舗の名称一覧を受け取り、次のおすすめ質問4件を返す |

## `app/` 配下のフォルダ構成

基本方針:

- `routes/` は React Router のルートモジュールだけを置く。
- 画面 UI は `components/feature/` に置き、ルートモジュールを薄く保つ。
- Client/Server で共用する型・ドメインモデルは `domain/models/` に置く。
- サーバー専用コードは `server/` 配下に閉じ込め、クライアントコンポーネントから import しない。
- `lib/` は用途が曖昧になりやすいため、新規コードでは使わない。
- 汎用ユーティリティは、ブラウザで実行できる純粋関数だけを `utils/` に置く。

推奨構成:

```txt
app/
├── root.tsx
├── routes.ts
├── app.css
├── routes/
├── components/
│   ├── feature/
│   └── ui/
├── domain/
│   ├── models/
│   └── services/
├── state/
├── constants/
├── mocks/
├── styles/
├── utils/
└── server/
    ├── services/
    ├── repositories/
    └── clients/
```

各フォルダの責務:

| フォルダ | 責務 | Client import |
| --- | --- | --- |
| `app/routes/` | URL と route module。loader/action/clientLoader などの接続層 | 可 |
| `app/components/feature/` | 画面・機能単位の UI コンポーネント | 可 |
| `app/components/ui/` | 汎用 UI プリミティブ | 可 |
| `app/domain/models/` | 店舗、検索条件、比較、AI 評価などの共用 domain model / type | 可 |
| `app/domain/services/` | Client/Server 両方から使う純粋関数（プロンプト文言の共通組み立て、キャッシュキー生成・鮮度判定など）。外部 I/O を持たない | 可 |
| `app/state/` | Jotai atom、派生 atom、状態操作 hook | 可 |
| `app/constants/` | 画面選択肢、表示ラベル、プロダクト固定値 | 可 |
| `app/mocks/` | 選択肢の固定語彙（相手種別・重視条件・エリア・予算ステップ）、テスト用の店舗モックデータ | 可 |
| `app/styles/` | theme token、色、UI スタイル計算 | 可 |
| `app/utils/` | `cn`、format、配列操作など副作用のない純粋関数 | 可 |
| `app/server/services/` | loader/action から呼ぶユースケース、AI 要約、比較生成、予約導線連携など | 不可 |
| `app/server/repositories/` | DB、検索 API、店舗データ、キャッシュなどのデータ取得・保存境界 | 不可 |
| `app/server/clients/` | 外部 API / SDK クライアント、HTTP adapter、AI SDK 経由の AI provider adapter | 不可 |

`server/services` と `server/repositories` の使い分け:

- `services`: 「何をするか」を表す。例: 店舗候補を取得して会食文脈に合わせた評価を付ける、比較まとめを生成する。
- `repositories`: 「どこからデータを取るか / 保存するか」を表す。例: 店舗検索 API、空席 API、AI 評価キャッシュ、店舗 DB。
- `clients`: 外部サービスとの低レベル接続を表す。例: 検索 API client、予約 API client、LLM client。

サーバー専用コードの import ルール:

- `app/server/**` は route module の `loader` / `action`、または他の `app/server/**` からのみ import する。
- `app/components/**`、`app/state/**`、`app/constants/**`、`app/mocks/**`、`app/styles/**`、`app/utils/**` から `app/server/**` を import しない。
- Client/Server の両方で使う型は `app/server/**` ではなく `app/domain/models/**` に置く。

## AI SDK 実装ルール

このセクションは「AI 処理をどう安全に、どこで実行するか」という実装面のルールを定義する。

### 採用ライブラリ

- AI SDK (`ai` パッケージ, Vercel) を LLM 呼び出しの共通レイヤーとして採用する。
- モデルプロバイダーは Google Gemini を採用し、`@ai-sdk/google` provider package 経由で接続する。他プロバイダーへの直書きや、provider 固有 SDK（`@google/generative-ai` など）への直接依存はしない。
- 店舗候補の探索は Gemini のグラウンディング機能ではなく、Places API (New) の Text Search（`places:searchText`）を直接呼ぶ。理由は「検索・評価型」参照。AI（Gemini）は探索結果に対する構造化評価だけを担う。
- Gemini の API キーはサーバー専用環境変数（例: `GOOGLE_GENERATIVE_AI_API_KEY`）で管理し、`app/server/clients/` 以外からは参照しない。
- 構造化出力のスキーマ定義には zod を使い、`app/domain/models/` の型と対応させる。
- 実装時は記憶にある API を使わない。`ai` パッケージ・`@ai-sdk/google` 導入後は `node_modules/ai/docs/` と `node_modules/@ai-sdk/google/docs/` を参照し、インストール済みバージョンの API で書く。モデル ID（`gemini-*`）も記憶で決め打ちせず、実装時点の最新一覧で確認する。

### 実行境界: AI 処理はサーバー専用

AI 処理はすべてサーバー側で完結させ、ブラウザに API キーやプロンプト構築ロジックを渡さない。上記の Client/Server 境界に従い、以下に責務を分ける。

- `app/server/clients/`: 外部サービスとの低レベル接続。AI SDK の呼び出しそのものを薄いラッパーとして置く（`gemini-evaluation.ts`: `generateObject` による構造化評価、`gemini-results-chat.ts`: `streamText` による地図コンテキスト相談、`gemini-results-chat-suggestions.ts`: `generateObject` によるおすすめ質問生成）。`google-places.ts` は Places API (New) の Text Search（`searchPlacesByText`）と Place Photos の REST 呼び出しを実装し、施設検索と代表写真の取得を担う（詳細は「検索・評価型」「店舗写真の取得」を参照）。プロバイダー設定・モデル ID・API キー参照はここに閉じ込める。デフォルトの Gemini モデル ID と生成設定は `gemini-models.ts` に集約し、現行は `gemini-3-flash-preview` を使う。
- `app/server/services/`: ユースケース単位の処理（検索・評価、質問応答など）。検索クエリ・プロンプトの組み立てはここで行い、`clients` の関数を呼ぶ。
- `app/server/repositories/`: 完成済みの `Restaurant` データの取得・保存境界。外部 API は呼ばず、保存・取得だけを担当する（現時点でキャッシュ実装は無く、mock/real 切り替えの `restaurant-search-repository.ts` / `photo-repository.ts` のみ）。

### ユースケース別の使い方

Best Table の AI ユースケースは大きく2種類に分かれ、それぞれ扱いを変える。

1. 検索・評価型（Places API 施設検索 + Gemini 構造化評価）: ヒアリング条件に合いそうな店舗を探し、AI 評価まで含めた `Restaurant[]` を1回の検索でまとめて生成する。

   施設検索（a.）は Gemini のグラウンディングではなく Places API (New) の Text Search を直接呼ぶ。以前は Gemini の Google マップによるグラウンディングを使っていたが、そのグラウンディングは自由文生成の副産物として候補を得る仕組みのため非決定的で、レイテンシが大きく（30件分の説明文をモデルに生成させていた）、「もっと読み込む」でページングのたびに再実行すると候補の重複・欠落が起きる問題があった。Places API を直接呼ぶ構成に変更したことで、同一条件・同一 `pageSize` なら常に同じ順序の候補が返る（決定的）ため、キャッシュを持たずにページごとに呼び直しても重複・欠落が起きない。

   トリガーはヒアリング完了後の検索実行。受け口は画面を持たない resource route `app/routes/api.restaurants.search.stream.tsx`（`/api/restaurants/search/stream`）の `action` で、`_layout.results.tsx`（`results-screen.tsx`）は URL query state から復元した検索条件を `fetch` の POST body として渡す。`mvp-cycle-5` では、検索条件は Jotai だけに閉じず `nuqs` による URL query state を復元元にする。外部 API サーバーは別途立てない。

   内部的には性質の異なる2つの呼び出しを `app/server/services/restaurant-search.ts` の `streamRestaurants` の中で直列に実行する。応答は改行区切り JSON（NDJSON）のストリームで、`{ type: "phase", phase: "searching" }` → 施設検索が確定した店舗ごとの `{ type: "restaurant", restaurant }`（AI生成フィールドは null）→ `{ type: "phase", phase: "evaluating" }` → AI評価が確定した店舗ごとの `{ type: "restaurant-evaluated", restaurant }`（同じ `id`、AI生成フィールドが埋まった状態）→ `{ type: "done", fromCache, hasMore, nextOffset }` の順に流れる。**基本の店舗一覧は AI 評価を待たずに先に表示し、AI 評価（マッチ度含む）は後から店舗単位で反映する**（以前は a. の施設検索と b. の構造化評価を常にセットで1店舗分として届けていたが、この設計は撤回した）。クライアントは `response.body.getReader()` で1行ずつ読み、`restaurant` イベントは `appendRestaurants` で一覧へ追加、`restaurant-evaluated` イベントは `updateRestaurant` で同じ `id` の既存エントリを差し替える。一覧の並び順は施設検索（Places API）が返した順のまま固定し、AI評価の到着順では並び替えない（並び替えるとカードが飛び跳ねるため）。店舗カード形状のスケルトンは `phase: searching` の候補探索中だけ表示し、`phase: evaluating` の AI評価中は追加表示しない。検索中は `SearchPhaseStatus`（`app/components/feature/results/search-phase-status.tsx`）が現在のフェーズと完了件数（`getSearchPhaseMessage`、`app/utils/search-phase-message.ts`。完了件数は `restaurant-evaluated` の到着数を数える）を表示し、比較トレイ等のナビゲーションはブロックしない。mock mode（`MODE=mock`）では `phase: searching` → 全店舗の基本形（AI生成フィールドを null 化したもの）を `restaurant` として送信 → `phase: evaluating` → 元のフィクスチャ（評価済み）を `restaurant-evaluated` として1件ずつ間隔を空けて送信、という同じ2段階の流れを模する。

   非ストリーム版の `app/routes/api.restaurants.search.tsx`（`/api/restaurants/search`）も実装として残っているが、現在 UI からは呼ばれない。`app/mocks/fixtures/restaurants-search.json` フィクスチャを再生成する際に直接 POST する用途にのみ使う（下記「mock mode」を参照）。

   a. 施設検索（候補収集、`app/server/clients/google-places.ts` の `searchPlacesByText`）
      - Places API (New) の Text Search（`POST /v1/places:searchText`）を呼ぶ。`textQuery` は通常検索ではエリア名 + 「接待」「レストラン」+ 重視条件の短いキーワード（`app/server/services/restaurant-search-query.ts` の `buildPlaceSearchQuery`）にする。地図の「このエリアを検索」では旧エリア名を `textQuery` から外し、「接待」「レストラン」+ 重視条件にして、地図中心座標を `locationBias.circle` に渡す。通常検索の緯度経度はヒアリングのエリア選択を `app/constants/area-coordinates.ts` の固定対応表で変換する（`resolveAreaLatLng`）。現状エリアは固定選択肢のため静的な対応表で十分とし、エリアが自由入力・動的になった場合のみ Geocoding API 等の追加変換を検討する。
      - フィールドマスクは `places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.photos`（`GOOGLE_PLACES_SEARCH_FIELD_MASK`）。1回のレスポンスで店舗名・`placeId`・住所・座標・電話・代表写真参照までまとめて取得できるため、以前のグラウンディング構成にあった候補ごとの Place Details 呼び出しは不要になった。応答に現れた店舗だけを候補にし、該当が少ない場合は水増しせずそのまま返す。
      - `pageSize` は Text Search 1回あたり最大20件（API 側の上限）。`offset + limit`（既定は10、最大20）を要求し、`offset:offset+limit` でスライスして返す。`offset + limit` が20を超えるページ（3ページ目以降）には対応していない（`pageToken` による継続取得は未実装）。
      - `placeId` は Text Search の `id`（`"ChIJ..."` 形式）を `"places/ChIJ..."` に正規化してから保持する。そのまま `Restaurant.id` に使うと URL セグメントと衝突するため、`buildRestaurantId` で `/` を `_` に置換してから `id` に使う。`placeId` フィールド自体は `"places/..."` 形式のまま保持する。
      - `displayName` / `nationalPhoneNumber` を含めると Place Details 単体運用時より高い SKU ティアに乗る可能性がある（要確認）。店舗名の取得自体が Text Search では必須のため避けられないが、実装・運用時に [Places API 料金ページ](https://developers.google.com/maps/billing-and-pricing/pricing)で実際の SKU・無料枠を確認すること。
   b. 構造化評価呼び出し（AI 評価の生成）
      - a. で得た候補一覧（店舗名・住所・電話）とヒアリング条件をもとに、`generateObject`（zod スキーマ、`app/domain/models/restaurant-evaluation-schema.ts`）で `Restaurant` 型の AI 生成フィールド（`room` / `quiet` / `prestige` / `service` / `budgetLabel` / `concerns` / `matchingSummary` / `evidence` / `confidence` / `generatedAt`）を構造化データとして生成する（`app/server/clients/gemini-evaluation.ts`）。フリーテキストの後処理パースに頼らない。
      - 個室有無・接待向きかどうかなど、Places API 側にないプロダクト固有の評価軸は、この呼び出しで初めて生成する（a. では扱わない）。
      - AI は `score`（連続値の総合スコア）を生成しない。代わりに `app/server/services/restaurant-search.ts` の `buildRestaurant()` が、上記のAI評価フィールドとヒアリング条件（相手種別・予算・重視条件）を `app/utils/scoring.ts` の `computeMatchTier` に渡し、決定的に「マッチ度」（`highest`/`high`/`medium`/`low`、`Restaurant.matchTier`）を算出する。マッチ度の算出方法は `docs/MODEL.md`「コンテキスト2」を参照。

   - 検索結果（`Restaurant[]`）のキャッシュは現時点で実装していない。Places API の施設検索は決定的なため、ページングのたびに呼び直しても重複・欠落は起きないが、同一条件の再検索でも毎回 API を呼ぶ（キャッシュによる即時応答は無い）。キャッシュを再導入する場合は `docs/RELIABILITY.md` の段階的表示方針と、相手種別に依存する AI 評価をキーから外さない制約に従うこと。
   - a., b. のどちらが失敗・タイムアウトした場合も、`docs/RELIABILITY.md` の想定される失敗と、このドキュメントの「エラーハンドリングとフォールバック」に従う。

2. オンデマンド型（地図コンテキスト AI チャット）: `/results` の地図上で、表示中店舗群に対してユーザーが質問する。
   - 受け口は UI を持たない resource route `app/routes/api.results.chat.tsx`（`/api/results/chat`）で、地図エリア内のチャットパネルが `fetch` で POST する。検索対象の `Restaurant[]` はサーバー側に永続化していないため、クライアントが保持している表示中店舗群をリクエストボディに含めて渡す（サーバー側で各要素を `isRestaurant` により検証する）。ヒアリング条件の要約は、Client/Server 共用型 `app/domain/models/results-chat.ts` の `ResultsChatBookingSummary` で表現する。
   - `streamText` を使うが、検索入口を AI ファーストのチャットにはしない（`docs/DESIGN.md` のガードレール）。質問は初回 FAQ ボタン、回答後のおすすめ質問4件、または短い自由入力に限定する（クライアント・サーバーの両方で長さを検証する）。
   - resource route の `action` は `streamText` の結果をテキストストリームとして返す。クライアントは `response.body.getReader()` で読み取りながら逐次表示する。
   - 回答は `app/server/services/results-chat-prompt.ts` の prompt builder により、取得済みの `Restaurant[]` の構造化フィールド（`matchTier` / `room` / `quiet` / `prestige` / `service` / `budgetLabel` / `access` / `matchingSummary` / `concerns` など）とヒアリング条件に基づかせる。生の口コミ・写真・メニューのテキストは取得していないため、それらを根拠として持ち出さない。根拠がない場合は断定せず、不確実性を明示する。
   - 回答後は、resource route `app/routes/api.results.chat.suggestions.tsx`（`/api/results/chat/suggestions`）が次のおすすめ質問4件を生成する。プロンプト（`buildResultsChatSuggestionsPrompt`）は直前の質問・回答と表示中店舗の名称一覧のみを根拠にし、回答生成で既に使ったヒアリング条件・店舗詳細フィールドを重ねて渡さない（レイテンシ・プロンプトサイズを抑えるため）。生成する4件は「ユーザーがAIに尋ねる質問」（一人称の深掘り）にし、AIがユーザーに聞き返す形にしない。表示中店舗にない店舗や空席確定・予約成立を前提にした質問は禁止する。`app/utils/results-chat-suggestions.ts` の deterministic 生成（相手種別・重視条件・直前の質問/回答・表示中店舗群から算出）は、AI生成が失敗した場合、または安全フィルタ後に4件に満たない場合の穴埋め専用に残す。
   - 単一店舗詳細ページ `/stores/:storeId` と単一店舗質問 API `/api/stores/:storeId/ask` は `mvp-cycle-3` で廃止する。店舗ごとの詳細確認は `/results` の `StoreDetailPanel` に留め、AI 相談は表示中店舗群への横断相談として扱う。
   - ツール呼び出しが必要になった場合（例: 在庫 API を都度参照するなど）は、自前でループを書かず AI SDK の agent/tool 抽象を使う。

### プロンプト構築とセキュリティ

`docs/SECURITY.md` のプロンプトインジェクション対策を、AI SDK 実装では次のように具体化する。

- 店舗説明、口コミ、ユーザー自由入力は常に「データ」として扱い、system prompt やツール定義とは明確に分離する。
- プロンプトには生の長文をそのまま渡さず、`app/server/services/` で抽出・要約済みの根拠フィールドを渡す。
- ユーザー自由入力・店舗説明・口コミには長さ上限を設ける。上限は `app/server/services/` の入力検証で担保し、AI SDK 呼び出し側で無制限の文字列を受け付けない。
- 生成結果に含める引用テキストは短く制限し、隠しプロンプトや内部スコアリング式を出力させない。
- レート制限は route module の loader/action 側、または `app/server/clients/` のラッパーで行う。Places API の施設検索も同様に、1検索あたりの呼び出し回数の上限で課金・レートを抑える。

### エラーハンドリングとフォールバック

`docs/RELIABILITY.md` の想定される失敗に対応するため、AI SDK 呼び出しは次を満たす。

- 検索結果を表示している場面では、他のAI呼び出し（オンデマンド型の質問応答など）がタイムアウト・失敗しても、比較・ナビゲーションは動作し続ける。
- 施設検索または構造化評価の呼び出しが失敗・タイムアウトした場合は、検索結果画面自体にエラー状態を明示する（`docs/RELIABILITY.md`）。空のカードや架空の店舗で埋めない。
- AI 呼び出しの失敗は例外を握りつぶさず、呼び出し元（`services`）で「AI データなし」の状態として扱い、UI 側に不確実性として伝える。
- 不確実性を自信のある言葉で埋め合わせない。生成に失敗した場合、根拠のない代替文言を生成しない。
- Places API の施設検索が失敗する、または該当0件の場合も、比較・ナビゲーションなど他の操作は使える状態を保ち、0件・取得失敗であることを明示する。

## 店舗データモデル

`docs/DESIGN.md` の店舗カード・比較表の表示項目（店舗名、ジャンル、エリア、予算、個室・席、代表写真、個室有無、AI マッチングポイント要約）を、`app/domain/models/restaurant.ts` のひとつのフラットな `Restaurant` 型として置く。店舗データは Places API による施設検索と Gemini による AI 評価をまとめて一度に生成するだけなので、生データと AI 派生評価を型として分離しない。検索結果一覧、MAP、比較表はすべてこの型を参照し、画面ごとに別の形へ作り替えない。

`Restaurant` の型定義（フィールド、固定語彙 vs 自由記述の区別、null の意味）は `docs/MODEL.md` の「コンテキスト2: 店舗探索・評価」を正とする。このドキュメントでは実装配置とクライアント/サーバー境界だけを扱う。

当初は `AREA_REGIONS` / `BUDGET_STEPS`（相手種別・重視条件と同様、`app/mocks/data.ts` に定義されている）を `app/constants/` へ移設してから `Restaurant` 型の `area` / `budgetLabel` をそこから導出する型にする計画だったが、実装時には見送り、`area: string` / `budgetLabel: string | null` という素直な文字列型にした。`AREA_REGIONS` 等は現在も `app/mocks/data.ts` に置かれたままで、この移設は未実施。検索時のエリア→緯度経度変換だけを担う `app/constants/area-coordinates.ts` が、この `app/mocks/data.ts` の `AREA_REGIONS` を参照している。

`app/mocks/data.ts` の `Store` 型は `Restaurant & { pos, photoPlaceholderLabel }` として現在も定義されているが、`StoreList` / `ResultsMap` / `StoreDetailPanel` / `ComparePanel` はすべて `Restaurant` を直接受け取るようになっており、`pos`（画面上の相対位置）・`photoPlaceholderLabel`（プレースホルダー用ラベル文字列）はどのコンポーネントからも読まれていない。代表写真のプレースホルダーラベルは `room` から `resolvePhotoPlaceholderLabel`（`app/utils/photo-placeholder-label.ts`）で都度導出する。`STORES`（6件の固定データ）と `Store` 型自体はテストのフィクスチャとしてのみ使われている。

`app/mocks/data.ts` は現在、店舗のモックデータ置き場というより、`AREA_REGIONS` / `BUDGET_STEPS` / `COUNTERPARTS` / `PRIORITIES`（画面の選択肢・固定語彙の定義元、`docs/MODEL.md` 参照）の置き場としての役割が主になっている。

### 各画面での対応

- 検索結果カード・比較表: `docs/DESIGN.md` の表示項目は、この `Restaurant` 型のフィールドから組み立てる。`genre` / `room` / `access` / `phone` など Google 由来・AI 生成フィールドが `null` の場合は「情報なし」等のフォールバック文言を表示し、`null` をそのまま描画しない。
- MAP: `Restaurant.location` を地図表示の正とする。`location` がある店舗だけマーカー表示する。

## 店舗写真の取得

店舗カード・比較表の代表写真は `Restaurant.photoUrl` に格納する。施設検索（Text Search）のフィールドマスクに `places.photos` を含めており、候補ごとに追加の Place Details 呼び出しをせずに photo resource name を得る。

方針:

- Text Search のレスポンスに含まれる `photos[0].name`（photo resource name）を代表写真として使う。
- `Place Photos (New)` の `/media` は API キーでの認証が必須のため、その URL をそのまま `Restaurant.photoUrl` としてクライアントに渡さない。代わりに resource route `/api/photos/*`（`app/routes/api.photos.$.tsx`）を自前のプロキシとして用意し、`Restaurant.photoUrl` にはこのプロキシのパス（`buildStorePhotoProxyPath`）だけを格納する。実際の画像取得はこの route から呼ぶ `app/server/repositories/photo-repository.ts` の `getPhotoRepository()` が行い、mock/real の切り替えは検索結果と同じ repository パターンに統一する（下記「mock mode の写真取得」）。API キーはリクエストヘッダーに乗せてクライアントへは送らない。
- 写真の実体取得（`/media`）は表示済みの候補分のみで、まだ表示していない候補の写真を先読みしない。
- `Restaurant.photoUrl` がある場合は `StorePhoto`（`app/components/ui/store-photo.tsx`）が `<img>` で表示し、無い場合・読み込み失敗時は既存の `StorePhotoPlaceholder`（`room` から `resolvePhotoPlaceholderLabel` で導出したラベル）にフォールバックする。
- photo name にはキャッシュ制約と期限切れがあるため、永続的な保存対象は慎重に分ける。実装時は Google Maps Platform のキャッシュ制約を確認し、期限切れ時は再取得できるようにする。

### Text Search の FieldMask 方針

施設検索（`searchPlacesByText`）のフィールドマスク（`GOOGLE_PLACES_SEARCH_FIELD_MASK`、`app/server/clients/google-places.ts`）は次の6項目に絞る。

- `places.id`: `placeId` として保持し、`Restaurant.id` 生成や Google Maps リンクに使う。
- `places.displayName`: 店舗名（`Restaurant.name`）。Text Search では候補の名称そのものをここから取得する（探索自体を AI に依頼しないため必須）。
- `places.formattedAddress`: 店舗カード・詳細の住所表示用。
- `places.location`: 地図マーカー用の緯度経度。
- `places.nationalPhoneNumber`: 店舗カードの電話表示、AI 評価プロンプトの根拠情報に使う。
- `places.photos`: photo resource name を得るためのメタデータ。実画像取得は Place Photos の別呼び出しになる。

同じ Text Search 呼び出しで取れるが、現時点では避けるフィールド:

- `rating`, `userRatingCount`, `priceLevel`, `regularOpeningHours`, `websiteUri`, `reviews` など: より高い SKU ティアに乗る可能性があるため、実装時点では要求しない。追加する場合は事前に [Places API 料金ページ](https://developers.google.com/maps/billing-and-pricing/pricing)で SKU ティアの変化を確認すること。

`displayName` / `nationalPhoneNumber` を含めること自体が SKU ティアを上げる可能性がある点は未確認（要検証）。以前の Place Details 単体運用ではこれらを避けていたが、Text Search では店舗名の取得に `displayName` が必須なため、コストより機能要件を優先している。

### 信頼性・セキュリティ

- 写真の参照が無い場合も、店舗表示自体をブロックしない（`docs/RELIABILITY.md` の段階的表示方針に従う）。取得できない場合に根拠のない画像を生成・捏造しない。
- Google Places の API キーはサーバー専用環境変数で管理し、クライアントに渡さない（`docs/SECURITY.md` のクライアント側セキュリティに従う）。

## 地図表示の実装

検索結果画面の地図は Google Maps JavaScript API による実地図として実装済み。`@vis.gl/react-google-maps` の `APIProvider` / `Map` を `app/components/feature/maps/restaurant-map.tsx` に共通化し、`ResultsMap` から使う。比較サイドパネルは地図を持たず、比較表のみを表示する。

### ピンのデザイン

ピンは `google.maps.OverlayView` ベースの自前マーカー（`app/components/feature/maps/genre-marker-overlay.tsx` の `GenreMarkerOverlay`）で描画する。vis.gl の `<AdvancedMarker>`/`<Pin>` は使わない。理由は2つ:

- `<AdvancedMarker>` はベクターマップ（`mapId` 指定）が前提だが、`mapId` を指定すると `<Map>` の `styles` プロパティが効かなくなる（Google Maps JS API の制約）。下記「既存施設 POI の非表示」に `styles` が必要なため、ラスターマップのまま動く実装にする。
- `<Pin>` は marker content のコンテナを丸ごと自分の DOM で上書きする実装になっており、細かい見た目調整がしづらい。

`GenreMarkerOverlay` は `useMap()` で取得した地図インスタンスに対して `OverlayView` を1つ作り、`getPanes().overlayMouseTarget` に追加した素の `div` へ React の `createPortal` で任意の JSX を描画する。位置は `draw()` の中で `getProjection().fromLatLngToDivPixel()` により算出し、クリックは通常の DOM イベントとして扱う。

ピンの中にはジャンルアイコンを表示しない。地図上は単純な SVG ピンを表示し、店舗名ラベルはピン右側に添える。ピンの先端を `Restaurant.location` に合わせ、店舗名ラベルはアンカー位置に影響しない絶対配置にする。

### マッチ度の凡例（色分け表示）

`RestaurantMap`（`app/components/feature/maps/restaurant-map.tsx`）は常に `Restaurant.matchTier` でピンを色分けする（マスタースイッチで色分け自体をオフにする機能は無い）。塗り色は `app/components/feature/maps/match-tier-colors.ts` の `MATCH_TIER_COLORS`（4段階、`GOLD` 系2段階 + `NAVY` 系2段階）を使う。`matchTier` が `null`（未評価）の店舗は `resolveTierKey`/`resolveTierColor` により表示・フィルタ上「低」と同じ扱いにする（別の色や別の凡例行は設けない。データ上の `matchTier` 自体は `null` のままで、低評価だったと捏造はしない）。色をマッチ度専用にするため、選択中（`activeRestaurantId` と一致）のシグナルは色ではなく表現を変える: ピンのサイズを一回り大きくし、枠線を太くし（`strokeWidth` 2→3.5）、店舗名ラベルに `NAVY` の枠線を付ける。

`app/components/feature/maps/match-tier-legend.tsx` の `MatchTierLegend` は、地図右上に凡例（`highest`/`high`/`medium`/`low` の4行）を表示する。表示中の店舗に評価済み（`matchTier !== null`）のものが1件も無い間は凡例自体を表示しない（`ResultsMap` が判定する）。凡例の各行はそれぞれ独立したクリック可能なトグルで、クリックした段階に該当する店舗のピンだけを一時的に地図から隠す（他の段階の表示には影響しない。「低」を隠すと評価未生成の店舗のピンも一緒に隠れる）。どの段階を隠しているかは `ResultsMap`（`app/components/feature/results/results-map.tsx`）のローカル state（`Set<MatchTier>`）で管理し、`bookingAtom` には持たせない（この画面の表示状態であり、予約・検索の共有状態ではないため）。`RestaurantMap` はこの集合を `hiddenTiers` prop として受け取り、該当する店舗を描画対象から除外する。

店舗一覧・比較表側の `MatchTierBadge`（`app/components/ui/match-tier-badge.tsx`）は、この地図専用の4色パレットを再利用しない（凡例のスコープを地図に限定するため、一覧・比較は "highest" のみ `GOLD` で強調するミュートな表示のまま）。

`Restaurant.genre` は施設検索（Text Search）の出力には含まれないが、構造化評価（b.）で AI が生成する固定語彙のフィールドとして実装済み（`app/domain/models/restaurant.ts` の `Genre` 型、10種 + `"other"`）。`app/domain/models/restaurant-evaluation-schema.ts` の zod スキーマで `z.enum` として強制し、`app/server/services/restaurant-search.ts` の評価プロンプトにジャンル分類の指示を加えている。地図ピン自体はジャンルアイコンを持たない単純な SVG ピンのままで、`genre` は店舗一覧・比較表のテキストラベル（`GENRE_LABELS`）としてのみ使う。

### 既存施設 POI の非表示

`<Map styles={...}>` で `featureType: "poi.business"` を `visibility: "off"` にし、Google 標準の飲食店・店舗などの POI アイコンを非表示にする。駅・路線（`transit` 系、デフォルトのまま）や美術館などのランドマーク（`poi.attraction`、デフォルトのまま）はスタイルを変更せず表示したままにする。これにより、AI が比較対象として探している飲食店と、地図が最初から表示する無関係な既存施設のピンが混同されるのを防ぐ。

`Restaurant.location` / `address` / `photoUrl` は、施設検索（Text Search）のレスポンスにその店舗の値が含まれていた場合だけ埋める。含まれていない店舗は `location: null` や `photoUrl: null` のまま一覧・比較には残し、地図マーカーや写真はフォールバック表示にする（架空の座標・住所・写真は作らない）。

開発時は `pnpm dev:mock` を用意し、mock mode では `/api/restaurants/search` が Gemini・Places API を呼ばず、記録済みの API モック `Restaurant[]` を返す。これにより Google Maps の UI 実装とカード連動を、AI 応答や API キーに依存せず確認できる。`/api/results/chat` は mock mode でも Gemini（`streamText`）を実際に呼び出す。地図コンテキスト相談は表示中の `Restaurant[]` を都度リクエストボディで受け取るだけで、Places 等の課金対象 API に依存しないため、mock 固有の分岐を持たない。

mock/real の切り替えは resource route（`app/routes/api.restaurants.search.tsx`）の `action` に `if (MODE === "mock")` を書かず、repository 層（`app/server/repositories/restaurant-search-repository.ts`）に閉じ込める。`RestaurantSearchRepository`（`search(condition, pagination) => Promise<RestaurantSearchResult>`）というインターフェースを定義し、`realRestaurantSearchRepository`（`app/server/services/restaurant-search.ts` の `searchRestaurants` へ委譲）と `mockRestaurantSearchRepository`（同ファイル内の `loadMockRestaurants` でフィクスチャを読んでページングするだけ）の2実装を用意し、`getRestaurantSearchRepository()` が `process.env.MODE` を見てどちらを返すか決める。resource route 側は `getRestaurantSearchRepository().search(...)` を呼ぶだけで、mock か real かを意識しない。

この API モックは手書きの架空データではなく、実際に `/api/restaurants/search`（銀座・重要顧客・「落ち着いて話せる」を重視）を1回呼び出して得た結果をそのまま記録したもの。座標・住所・スコア・懸念点・`photoUrl`（Places の photo resource name への参照）はすべて実データであり、mock mode でも `StoreList` 等の表示ロジックを実運用と同じ形状で確認できる。

記録先は `app/mocks/fixtures/restaurants-search.json` で、`.gitignore` 対象（リポジトリには含めない）。`app/server/repositories/restaurant-search-repository.ts` の `loadMockRestaurants` がビルド時に `import` せず、リクエストのたびに `fs.readFileSync` でファイルを読み込む（API モックという性質上、静的 import でバンドルに焼き込まない）。ファイルが存在しない・壊れている場合は例外を投げず空配列にフォールバックするため、フィクスチャを生成していないクローンでも mock mode 自体は起動できる（検索結果が0件になるだけ）。フィクスチャの再生成は `pnpm dev`（`MODE=real`）を起動し、`/api/restaurants/search` を実際に呼び出した応答を保存し直す。

#### mock mode の写真取得

`photoUrl` の実体は `/api/photos/*` プロキシのパスなので、写真取得側（`app/routes/api.photos.$.tsx`）も検索結果と同じ repository パターンで mock/real を切り替える。`app/server/repositories/photo-repository.ts` に `PhotoRepository`（`getPhotoMedia(photoName) => Promise<Response | null>`）を定義し、`realPhotoRepository`（`fetchPlacePhotoMedia` で Google から画像を取得しストリームする）と `mockPhotoRepository` の2実装を用意、`getPhotoRepository()` が `process.env.MODE` で切り替える。resource route は `getPhotoRepository().getPhotoMedia(photoName)` を呼ぶだけで、mock か real かを意識しない。

`mockPhotoRepository` は `app/mocks/fixtures/photo-mapping.json`（`placeId → 代表写真 URL` の対応表、`.gitignore` 対象）を `loadMockPhotoMapping` でファイル読み込みし、`photoName`（`places/{placeId}/photos/{photoRef}`）から `placeId` 部分だけを取り出してマッピングを引く。一致する URL があれば `Response.redirect(url, 302)` を返すだけで、Google へは一切問い合わせない（画像バイトの中継すら行わない）。マッピングに無い placeId や、ファイル自体が存在しない場合は `null` を返し、`StorePhoto` が `StorePhotoPlaceholder` にフォールバックする。これにより mock mode は `GOOGLE_PLACES_API_KEY` に一切依存せずに動作する。

`photo-mapping.json` は `restaurants-search.json` に含まれる placeId と対応させて記録するため、同じディレクトリ・同じ `.gitignore` パターン（`/app/mocks/fixtures/*.json`）に置く。検索結果フィクスチャを再生成した場合は、対応する `photo-mapping.json` も合わせて更新する。

### 10件単位の取得

検索結果は一度に30件取得しない。初回は10件だけ取得し、店舗一覧の最下部までスクロールした時点で追加10件を取得する。これにより、Places API の `location` / `formattedAddress` / `photos` / Place Photos 取得が不要な候補にまで先行して発生することを避ける。

- `/api/restaurants/search` は初回10件を返し、追加取得リクエストで次の10件を返す。
- 取得範囲は `limit` と `offset` で表現し、レスポンスは `hasMore` / `nextOffset` を返す。
- 初回検索待ちは専用ロード画面にせず、Places API による候補探索中だけ `StoreList` と同じ幅のスケルトンリストを表示する。追加取得でも候補探索中だけ取得済み店舗の下に追加分のスケルトンを出し、AI評価中は既存カードの更新待ちとして扱う。取得済み店舗の閲覧・比較・地図操作はブロックしない。
- `MODE=mock` でも同じ10件単位の API 形状を通し、UI 側が mock mode を特別扱いしない。

### オーバーレイ配置 vs 外部配置

店舗一覧カードを「地図の内部（左側）にオーバーレイする」か「地図の外部（左側）に並べて置く」かを検討し、**外部配置（現状の Flexbox による左右分割構成を維持する）を推奨する**。

理由:

- 現状の実装（`results-screen.tsx`）は、すでに `StoreList` を左、`ResultsMap` を右に並べる Flexbox 構成になっている（`docs/DESIGN.md` の基本レイアウトもこれに合わせて修正済み）。地図のプレースホルダーを実際の Google Map に差し替えるだけで済み、レイアウトの作り替えが不要。
- オーバーレイ配置にする場合、次の追加考慮が必要になる。
  - Google Maps のロゴ・attribution（Google の利用規約上、カード等で隠してはいけない）を避ける配置調整。
  - 地図のドラッグ・ズーム操作と、カード内のスクロール操作が競合しないようにする pointer-events の使い分け（カードの外側は地図の操作を通す、カードの内側だけ操作を奪う）。
  - カードに隠れた位置のピンが見えなくならないよう、地図の表示範囲に padding を持たせる調整（`fitBounds` の padding オプションなど）。
  - 画面幅が狭い場合のレイアウト崩れ対策。
- プロトタイプの現段階では、これらを丁寧に作り込む優先度は高くないと判断する。外部配置でも「MAP を主体にした検索体験を維持する」という `docs/DESIGN.md` のガードレールは満たせる。

オーバーレイ配置自体は技術的に不可能ではなく、将来「よりネイティブな地図アプリらしい体験」が必要になった場合の拡張候補として残す。

### UX 観点の比較

技術的な理由に加え、UX の観点でも外部配置（split-pane）の方が Best Table には合うと判断する。

- **情報密度・可読性**: `docs/DESIGN.md` は「情報密度は高く、読みやすく保つ」「重要な懸念はカードや表に直接表示し、ホバーだけに隠さない」ことをガードレールにしている。オーバーレイカードは地図を覆いすぎないよう幅・高さを抑える必要があり、スコア・懸念・マッチングポイント要約などを並べる店舗カードには手狭になりやすい。外部配置なら列幅を確保でき、テキストを省略・ホバー依存にせずに表示できる。
- **操作の競合**: 地図をドラッグ・ピンチ操作する手つきと、カード内をスクロールする手つきが同じ画面領域で競合すると、「カードをスクロールしたつもりが地図が動く／その逆」が起きやすい（オーバーレイ型の地図UIでよく起きる既知の問題）。外部配置は地図とリストが別領域なので、この種の誤操作が起きにくい。
- **プロダクトのトーン**: Best Table は「汎用的なレストラン探索アプリ」ではなく「予約判断のリスクを下げる業務寄りのツール」（`docs/DESIGN.md`）を志向しており、狙う印象は信頼感・落ち着き・ビジネス用途への適合。地図全面にカードを浮かせる表現は、Airbnb やグルメ探しアプリのような「気軽に眺めて回遊する」体験の色が強くなりやすく、狙いのトーンとはややズレる。左右にきっちり分かれた構成の方が、実務ツールらしい落ち着いた印象に合う。
- **安定した寸法**: `docs/DESIGN.md` の UI ガイドラインにある「MAP、リスト、カード、トレイ、比較表は安定した寸法を持つようにする」にも、地図のズーム・パン状態に左右されない外部配置の方が素直に合致する。

一方でオーバーレイに分があるのは、画面幅が狭い（モバイル）場合である。左右分割は横幅を2列分必要とするため、狭い画面では物理的に成立しない。モバイル対応が必要になった時点で、次のいずれかを別途検討する。

- 地図を全面表示し、下からカードを覆いかぶせるボトムシート（一般的なモバイル地図アプリの定番パターン）。
- 「リスト表示」「地図表示」をタブやトグルで切り替える（一度に片方だけを見せる）。

`mvp-cycle-2` ではデスクトップ幅を主眼にした外部配置を採用し、モバイル向けレイアウトは表示が破綻しない範囲に留める。ボトムシートやリスト/地図切替は別サイクルの検討事項とする。

### 実装方針（外部配置）

- `results-screen.tsx` の Flexbox 構成（`StoreList` を左、`ResultsMap` を右）はそのまま維持する。
- `app/components/feature/results/results-map.tsx` は、共通の `RestaurantMap` を使って実地図を描画する。
- ライブラリは Google Maps JavaScript API の React バインディングとして `@vis.gl/react-google-maps` を使う。実装時点の 1.9.0 では `<APIProvider>` / `<Map>` を使用し、ピン自体は上記「ピンのデザイン」のとおり自前の `OverlayView` ラッパーで描画する（`<AdvancedMarker>`/`<Marker>`/`<Pin>` は使わない）。型定義は `@types/google.maps` を devDependencies に追加し、`tsconfig.json` の `compilerOptions.types` に `google.maps` を加えて有効化している。
- マーカーの位置には `Restaurant.location`（実緯度経度）をそのまま使う。`location` が `null` の店舗はマーカーを表示せず、架空の位置を作らない。
- マーカーと店舗カードの連動は画面ローカルの選択状態で実装する。マーカークリックで対応カードを強調し、店舗カード側の選択またはフォーカスで対応マーカーを強調する。比較追加状態そのものとは別概念として扱い、比較候補の選択を地図操作で勝手に変更しない。
- 店舗詳細パネルの表示対象（`results-screen.tsx` の `selectedStoreId`）が変わったときは、`RestaurantMap` の `focusRestaurantId` prop 経由で地図の中心を対象店舗の位置へ `panTo` する（`app/components/feature/maps/restaurant-map.tsx` の `MapCenterOnFocus`）。`useMap()` で取得した地図インスタンスに対して行うため `<Map>` の子として配置する。依存配列は対象店舗の緯度経度（プリミティブ値）のみとし、`restaurants` 配列の参照（AI評価の到着ごとに再生成される）を依存に含めない。含めてしまうと評価到着のたびに `panTo` が再実行され、パン中のアニメーションが中断されて「動きが止まる」ように見える不具合があった。
- カードのホバー・フォーカスによる `activeStoreId` の変更だけでは中心移動しない（一覧を眺めているだけのユーザーの視点を勝手に動かさないため）。
- 地図の初期表示は、取得した店舗群の座標に合わせて `getInitialMapCamera` で center / zoom を計算する。
- `app/mocks/` には `Restaurant.location` を持つ mock search result を置き、`pnpm dev:mock` では API route 境界でそのデータを返す。UI 側が mock mode を特別扱いしない構成を優先する。
- 代表写真は `Restaurant.photoUrl` がある場合だけ表示し、無い場合は既存の `StorePhotoPlaceholder` を使う。写真取得は一覧全件に対して先行実行せず、10件単位の取得範囲に限定する。

### API キーの扱い

- 地図表示はクライアント（ブラウザ）で Google Maps JavaScript API を読み込むため、サーバー専用キーとは別の、ブラウザ向け API キーを用意する。`GOOGLE_PLACES_API_KEY`（サーバー専用）は施設検索（Text Search）と代表写真の取得の両方で使い、独立した `GOOGLE_MAPS_API_KEY` は不要。Gemini 側は構造化評価のみを担い、`GOOGLE_GENERATIVE_AI_API_KEY` で完結する。
- このプロジェクトのビルドツールは Vite（`@react-router/dev` 経由）のため、クライアントに埋め込む環境変数は `VITE_` プレフィックスを付けたものだけがバンドルに含まれる（`VITE_GOOGLE_MAPS_BROWSER_KEY`）。無プレフィックスのサーバー専用キーとは明確に分ける。
- ブラウザ向け API キーは Google Cloud Console 側で HTTP リファラー制限をかけ、想定外のドメインから使われないようにする。
- `placeId` から座標を解決する API キーはサーバー側に置き、ブラウザには渡さない。既存の `GOOGLE_PLACES_API_KEY` を使うか、実装時点の Google API の推奨に合わせて専用のサーバー環境変数を使う。
- 住所・写真メタデータ・Place Photos 取得もサーバー側で行う。Place Photos の photo name はキャッシュ制約があるため、永続キャッシュする値と都度取得する値を実装時に分ける。
- `pnpm dev` は `MODE=real`、`pnpm dev:mock` は `MODE=mock` を立てる。`MODE=mock` の場合、課金・鮮度の対象になる検索・座標解決・写真取得の外部呼び出しは避け、repository 層で mock/real を切り替える。一方、地図コンテキスト AI チャット（`/api/results/chat`）は Gemini の `streamText` 呼び出しのみで完結し、リクエストごとに表示中の `Restaurant[]` を受け取るだけの単発処理のため、mock/real で分岐せず常に Gemini を呼ぶ。クライアントは mock/real を意識しない。

### 信頼性

- Google Maps JavaScript API の読み込みに失敗した場合も、店舗一覧・比較・ナビゲーションなど他の機能はブロックしない（`docs/RELIABILITY.md` の段階的表示方針）。地図部分だけエラー表示・再試行導線にする。

## 現在の機能領域

機能コンポーネント:

- トップ: `app/components/feature/top/`
- ヒアリング: `app/components/feature/hearing/`
- 検索結果・店舗詳細パネル・比較サイドパネル・地図コンテキスト AI チャット: `app/components/feature/results/`
- 地図（共通地図部品・ピンオーバーレイ）: `app/components/feature/maps/`
- レイアウト: `app/components/feature/layout/`

共有状態:

- Jotai atom と操作用 hook: `app/state/`

サーバー専用コード（実装済み）:

- AI・外部 API クライアントの薄いラッパー: `app/server/clients/`（`gemini-evaluation.ts` / `gemini-results-chat.ts` / `gemini-results-chat-suggestions.ts` / `gemini-models.ts` / `google-places.ts`: Places API Text Search + Photos）
- ユースケース単位の処理: `app/server/services/`（`restaurant-search.ts` / `restaurant-search-query.ts` / `restaurant-search-pagination.ts` / `results-chat-prompt.ts` / `results-chat-validation.ts`）
- リポジトリ: `app/server/repositories/`（`restaurant-search-repository.ts`: mock/real 切り替え、`photo-repository.ts`: 写真取得の mock/real 切り替え。キャッシュは実装していない）
- 共通処理: `app/server/utils/summarize-error.ts`（ログ出力用のエラー要約）

ドメインサービス（Client/Server 両方から参照可能な純粋関数）:

- `app/domain/services/`（`booking-summary-format.ts`: 会食条件を人が読める文言に変換）

モックデータ、定数、ユーティリティ:

- 選択肢の固定語彙（相手種別・重視条件・エリア・予算ステップ）と、テスト用の店舗モックデータ: `app/mocks/data.ts`（`AREA_REGIONS` 等の `app/constants/` への移設は未実施、上記「店舗データモデル」を参照）
- エリア→緯度経度の変換など、実検索で使う定数: `app/constants/`
- theme token・スタイル計算: `app/styles/`
- 汎用純粋関数: `app/utils/`

## 状態モデル

予約・検索条件と画面内一時状態は、URL query state と Jotai で責務を分けて管理する。

実装方針:

- `BookingRequest` 相当の検索・会食条件（エリア、日付、時刻、人数、相手種別、予算、重視条件、自由入力）は、`nuqs` の parser / serializer と React Router の `useSearchParams` で URL query state として扱う。値は `app/state/booking-query-state.ts` の `BookingQueryState` として定義し、Jotai の `BookingState` からは分離している。
- URL query が空、または一部欠けている場合は `DEFAULT_BOOKING_QUERY`（`app/state/booking-query-state.ts`）相当の初期値で補完する（`normalizeBookingQuery`）。加えて `/`（`TopScreen`）は初回マウント時、URL に query が一切無ければ `DEFAULT_BOOKING_QUERY` を明示的に URL へ書き込む（`?` のまま初期値だけ暗黙適用にしない）。
- URL query から復元した値は、固定語彙・型・上限に合わせて正規化してから UI、検索 API、AI チャットの `bookingSummary` に渡す。
- Jotai の `bookingAtom`（`BookingState`）は、比較候補（`compareIds`）と取得済み店舗（`restaurants`）だけを持つ、URL に保存しない画面内一時状態専用の atom。検索・会食条件のミラーや互換用セッターは持たない。
- 画面コンポーネントは、検索条件については query state を正とし、URL に保存しない状態については `useBooking()` から状態と操作を取得する。
- `BookingProvider` は Jotai の store スコープを作るために `app/root.tsx` でアプリ全体を包む。
- query parser / serializer / normalize 処理は、ルートモジュールへ散らさず、`app/state/` または Client/Server 両方から使える純粋関数として集約する。

主な状態グループ:

- URL query state: 検索基本条件、会食文脈、予算、重視条件
- Jotai 一時状態: 比較候補、取得済み `Restaurant[]`
- コンポーネントローカル state: 詳細パネル開閉、比較サイドパネル開閉、地図凡例の表示/非表示、地図中心の追加検索状態

インタラクション制約:

- 重視条件は最大3つまで。
- 比較候補は最大5件まで。
- 通常の比較フローでは、2件以上の選択を必要とする。

## 画面責務

### トップ

最初の従来型検索意図を受け取り、ヒアリングフローへ導く。

マーケティング用ランディングページにはしない。最初の画面から実際に使えるプロダクトとして振る舞う。

### ヒアリング

AI 評価軸に影響する文脈を収集する。

- 誰との会食か
- 予算
- 特に外したくないこと

短く保つ。ユーザーには長いフォームではなく、リスクを明確にしている感覚を与える。

### 検索結果

AI 評価を組み込んだ MAP/リスト型の検索結果画面を表示する。

結果画面で見えるべきもの:

- 検索条件の要約
- MAP
- 店舗一覧
- 店舗カードの基本情報
- AI によるマッチングポイント要約
- カードまたはマーカー選択で開く右側の店舗詳細パネル
- 比較に追加する操作
- 比較トレイ
- 比較サイドパネル（地図エリアを上書き表示）

### 比較

選択した候補を一貫した比較表で表示する。個別カードよりも違いが明確になることを優先する。最終候補の確定やアプリ内予約導線への遷移は扱わない（`mvp-cycle-4` で撤回）。`mvp-cycle-6` で、各店舗列に外部への送客リンク（全店舗に「一休.comで空席を確認」「Google Mapで空席・予約を確認」）を置く。送客リンクは確定操作ではなく、アプリ側に選択状態を残さない。

## UI ガイドライン

- 情報密度は高く、読みやすく保つ。
- 説明文よりも簡潔なラベルを優先する。
- 店舗の重要な懸念はカードや表に直接表示する。
- 重要情報をホバーだけに依存させない。
- 判断の確信度と懸念の強さが視覚的に分かるようにする。
- AI 文言は短く、根拠があり、スキャンしやすくする。
- カードは店舗一覧や集中パネルに使い、ページ全体をカードだらけにしない。
- 明確な操作には必要に応じてアイコンを使う。
- MAP、リスト、カード、トレイ、比較表は安定した寸法を持つようにする。

## データ表示ガイドライン

店舗カードで扱う項目:

- 店舗名
- ジャンル
- エリア
- 予算
- 個室・席
- 代表写真またはプレースホルダー
- 個室有無
- AI によるマッチングポイント要約
- 比較に追加する操作
- 店舗詳細パネルを開くカード全体の選択操作

比較表で扱う項目:

- 店舗名
- ジャンル
- エリア
- 予算
- 個室・席
- 代表写真またはプレースホルダー
- 個室有無
- AI によるマッチングポイント要約

## 追加ルート実装時のルール

確定ルートを実装する場合も、共通レイアウト配下に置く限り `_layout.*.tsx` の命名を維持する。

- 店舗ごとの詳細は `/results` 内の詳細パネルに統一し、別 URL の店舗詳細ページは使わない。
- 複数店舗の比較は `/results` 内の比較サイドパネルに統一し、別 URL の比較画面は使わない。
- 画面固有の UI 実装は `app/components/feature/<area>/` に置き、ルートモジュールは接続層に留める。

## 検証コマンド

コード構成、ルート、状態管理、UI、サーバー境界を変更した後は以下を実行する。

```bash
pnpm test
pnpm run typecheck
pnpm build
```

ルート変更時に確認する画面:

- `/`
- `/hearing`
- `/results`（比較サイドパネルの開閉を含む）

AI SDK のバージョンアップやプロバイダー変更を行った場合は、`/results` の AI 評価表示と地図コンテキスト AI チャットを実際に確認する。
