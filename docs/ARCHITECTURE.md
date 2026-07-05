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
- Google Maps JavaScript API（React バインディング用に `@vis.gl/react-google-maps` を導入済みだが、後述「地図表示の実装」の理由により未接続。現状 `/results` の地図はプレースホルダーのまま）
- Google Places API (New) は現状未使用。理由は「店舗写真の取得」を参照

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
- 動的セグメントが必要な場合は `$` 接頭辞を使う。例: `_layout.stores.$storeId.tsx` -> `/stores/:storeId`。
- ルートモジュールには画面固有の最小限の接続だけを置き、実 UI は `app/components/feature/<area>/` に置く。
- 独立した API サーバーは置かない。AI 呼び出しを含むサーバー処理は、すべて React Router の route module（`loader` / `action`）が受け口になる。デフォルトエクスポート（UI コンポーネント）を持たない resource route も、同じファイルベースルーティング規約の上でこの API 受け口として使ってよい。
- 画面を持たない resource route は `_layout.*` ではなく `api.` プレフィックスのトップレベルルートに置く（例: `api.stores.$storeId.ask.tsx` -> `/api/stores/:storeId/ask`）。resource route はレイアウトを描画しないため `_layout` 配下に置く意味がなく、URL からも API であることが分かるようにする。

確定ルート:

| URL | ルートモジュール | 画面責務 |
| --- | --- | --- |
| `/` | `app/routes/_layout._index.tsx` | トップ / 検索入口 |
| `/hearing` | `app/routes/_layout.hearing.tsx` | 会食文脈と基本条件のヒアリング |
| `/results` | `app/routes/_layout.results.tsx` | MAP 付き検索結果、AI 評価付き店舗カード、比較追加 |
| `/compare` | `app/routes/_layout.compare.tsx` | 選択候補の比較、最終候補選択、予約導線 |
| `/stores/:storeId` | `app/routes/_layout.stores.$storeId.tsx` | 店舗詳細、店舗情報に基づく AI 質問応答 |
| `/reservation-handoff` | `app/routes/_layout.reservation-handoff.tsx` | 外部予約導線または予約前確認への受け渡し（未実装。`final-store-panel.tsx` の「一休で予約する」は現状 `href="#"` のプレースホルダー） |

上記を実装予定の正式なパス設計とする。初期実装で画面が未完成の場合でも、追加時はこの URL とルートモジュール名に合わせる。`/reservation-handoff` 以外はすべて実装済み。

画面を持たない resource route（現状の実装）:

| URL | ルートモジュール | 責務 |
| --- | --- | --- |
| `/api/restaurants/search` | `app/routes/api.restaurants.search.tsx` | 検索条件を受け取り、Gemini によるグラウンディング＋構造化評価を実行して `Restaurant[]` を返す |
| `/api/stores/:storeId/ask` | `app/routes/api.stores.$storeId.ask.tsx` | 店舗データと質問文を受け取り、`streamText` の結果をテキストストリームとして返す |

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
│   └── models/
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
| `app/state/` | Jotai atom、派生 atom、状態操作 hook | 可 |
| `app/constants/` | 画面選択肢、表示ラベル、プロダクト固定値 | 可 |
| `app/mocks/` | プロトタイプ用の店舗データ、検索結果、AI 評価モック | 可 |
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
- 店舗候補の探索には、自前で Google Maps Places API を呼ぶ tool を実装するのではなく、Gemini の「Google マップによるグラウンディング」機能を使う。`@ai-sdk/google`（実装時点のバージョン: 4.0.8）が `google.tools.googleMaps({})` として直接サポートしており、位置情報は `generateText` の `providerOptions.google.retrievalConfig.latLng` で渡す（Google 公式 SDK を直接使う薄いラッパーは不要だった）。詳細は下記「検索・評価型」を参照。
- Gemini の API キーはサーバー専用環境変数（例: `GOOGLE_GENERATIVE_AI_API_KEY`）で管理し、`app/server/clients/` 以外からは参照しない。
- 構造化出力のスキーマ定義には zod を使い、`app/domain/models/` の型と対応させる。
- 実装時は記憶にある API を使わない。`ai` パッケージ・`@ai-sdk/google` 導入後は `node_modules/ai/docs/` と `node_modules/@ai-sdk/google/docs/` を参照し、インストール済みバージョンの API で書く。モデル ID（`gemini-*`）も記憶で決め打ちせず、実装時点の最新一覧で確認する。

### 実行境界: AI 処理はサーバー専用

AI 処理はすべてサーバー側で完結させ、ブラウザに API キーやプロンプト構築ロジックを渡さない。上記の Client/Server 境界に従い、以下に責務を分ける。

- `app/server/clients/`: 外部サービスとの低レベル接続。AI SDK の呼び出しそのものを薄いラッパーとして置く（`gemini-grounding.ts`: `generateText` + Google マップによるグラウンディング、`gemini-evaluation.ts`: `generateObject` による構造化評価、`gemini-ask.ts`: `streamText` による店舗詳細 Q&A）。Google Places の写真関連 REST 呼び出しは、詳細は「店舗写真の取得」のとおり現状不要と判明したため実装していない。プロバイダー設定・モデル ID・API キー参照はここに閉じ込める。
- `app/server/services/`: ユースケース単位の処理（検索・評価、質問応答など）。プロンプトの組み立てや、グラウンディングの入力（緯度経度など）の用意はここで行い、`clients` の関数を呼ぶ。
- `app/server/repositories/`: 完成済みの `Restaurant` データ、AI 評価キャッシュ、検索候補キャッシュの取得・保存。外部 API は呼ばず、保存・取得だけを担当する。

### ユースケース別の使い方

Best Table の AI ユースケースは大きく2種類に分かれ、それぞれ扱いを変える。

1. 検索・評価型（Gemini の Google マップによるグラウンディング + 構造化評価）: ヒアリング条件に合いそうな店舗を探し、AI 評価まで含めた `Restaurant[]` を1回の検索でまとめて生成する。参考: [Gemini Enterprise Agent Platform: Google マップによるグラウンディング](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-google-maps)。

   トリガーはヒアリング完了後の検索実行。受け口は画面を持たない resource route `app/routes/api.restaurants.search.tsx`（`/api/restaurants/search`）の `action` で、`_layout.results.tsx` はマウント時にクライアントの `useFetcher` でここへ POST する。検索条件はヒアリングの結果が Jotai の `bookingAtom`（クライアント state）にしかないため、`_layout.results.tsx` の `loader` やクエリパラメータではなく、この resource route への POST body として渡す形にした（当初案からの変更点）。外部 API サーバーは別途立てない。

   内部的には性質の異なる2つの呼び出しを `app/server/services/restaurant-search.ts` の中で直列に実行するが、ユーザーからは1回の検索としてまとめて結果が返る。**基本の店舗一覧を先に表示してから AI 評価を後埋めする、という段階表示にはしない**（このユースケース自体が最初から AI 生成であるため）。検索中は `/results` が明確なローディング表示を出し、比較トレイ等のナビゲーションはブロックしない。

   a. グラウンディング呼び出し（候補収集、`app/server/clients/gemini-grounding.ts`）
      - 自前で Google Maps Places API を呼ぶ tool は実装しない。代わりに `generateText` の `tools: { google_maps: google.tools.googleMaps({}) }` と `providerOptions.google.retrievalConfig.latLng` で、Gemini に地理空間データを直接参照させる。
      - 位置情報は緯度経度でしか渡せない。ヒアリングのエリア選択（`selectedAreas`、例: 銀座、六本木）は `app/constants/area-coordinates.ts` の固定のエリア→緯度経度対応表で変換してから渡す（`resolveAreaLatLng`。選択エリアの先頭から解決できるものを使う）。現状エリアは固定選択肢のため静的な対応表で十分とし、エリアが自由入力・動的になった場合のみ Geocoding API 等の追加変換を検討する。
      - この呼び出しは自由文生成（`generateText`）で行う（グラウンディングを使う都合上、構造化出力の `generateObject` とは併用しない）。実際の応答を確認したところ、`providerMetadata.google.groundingMetadata.groundingChunks[].maps` には `{ uri, title, placeId }` のみが含まれ、住所・位置座標・写真参照は含まれていなかった。そのため:
        - 店舗名・`placeId`・Maps URL はグラウンディングメタデータからそのまま取得する。グラウンディングメタデータに現れない店舗を AI に作文させない。
        - 住所は、応答本文（自由文）の店舗名近傍からベストエフォートで正規表現抽出する（`extractAddressFromText`）。見つからない場合は `null` のままにし、捏造しない。
        - `location`（実緯度経度）と `photoUrl` は現状つねに `null`。グラウンディング出力に位置座標・写真参照が含まれていないため解決しようがなく、追加の Geocoding／Places 呼び出しもしない（下記「店舗写真の取得」「地図表示の実装」を参照）。
      - `placeId` は `"places/ChIJ..."` のように `/` を含む形式で返ることがある。そのまま `Restaurant.id` に使うと `/stores/:storeId` のルーティングが壊れるため（`/stores/places/ChIJ...` は2セグメントになり404になる）、`buildRestaurantId` で `/` を `_` に置換してから `id` に使う。`placeId` フィールド自体は元の形式のまま保持する。
      - 目標件数は30件（プロンプト内で指定）。Gemini が返す候補がそれに満たない場合は取得できた件数のまま返し、水増しはしない。
   b. 構造化評価呼び出し（AI 評価の生成）
      - a. で得た候補一覧とヒアリング条件をもとに、`generateObject`（zod スキーマ、`app/domain/models/restaurant-evaluation-schema.ts`）で `Restaurant` 型の AI 生成フィールド（`score` / `room` / `quiet` / `prestige` / `service` / `budgetLabel` / `concerns` / `matchingSummary` / `evidence` / `confidence` / `generatedAt`）を構造化データとして生成する（`app/server/clients/gemini-evaluation.ts`）。フリーテキストの後処理パースに頼らない。
      - 個室有無・接待向きかどうかなど、Google マップ側にないプロダクト固有の評価軸は、この呼び出しで初めて生成する（a. では扱わない）。

   - 検索結果（a. と b. をまとめた `Restaurant[]`）は、正規化したヒアリング条件（エリア座標・日時・人数・予算・重視条件・会食文脈の相手種別）から作るキーで `app/server/repositories/` にキャッシュする。同一条件での再検索はキャッシュから即座に返す（`docs/RELIABILITY.md` の段階的表示）。キャッシュされる `Restaurant` には相手種別に依存する AI 評価が含まれるため、相手種別をキーから外さない。
   - Gemini の呼び出しには利用回数の上限がある（例: 一部モデルで Google マップによるグラウンディングは1日あたり5,000クエリ）。キャッシュ優先と1検索あたりの呼び出し回数の抑制で、この上限と課金を管理する。
   - a., b. のどちらが失敗・タイムアウトした場合も、`docs/RELIABILITY.md` の想定される失敗と、このドキュメントの「エラーハンドリングとフォールバック」に従う。

2. オンデマンド型（店舗詳細の質問応答）: 店舗詳細ページでのユーザーの質問応答。
   - 受け口は UI を持たない resource route `app/routes/api.stores.$storeId.ask.tsx`（`/api/stores/:storeId/ask`）で、`StoreAskPanel`（`app/components/feature/store-detail/store-ask-panel.tsx`）が `fetch` で POST する。検索対象の `Restaurant` オブジェクトはサーバー側に永続化していないため、クライアントが保持している `Restaurant` をリクエストボディにそのまま含めて渡す（サーバー側で `isRestaurant` により形状を検証する）。
   - `streamText`（`app/server/clients/gemini-ask.ts`）を使うが、UI 全体を AI ファーストのチャットにはしない（`docs/DESIGN.md` のガードレール）。質問はあらかじめ用意された定型質問ボタン、または100文字までの自由入力に限定する（クライアント・サーバーの両方で長さを検証する）。
   - resource route の `action` は `streamText` の結果を `toTextStreamResponse()` でそのまま返す（UI Message Stream Protocol は使わない単発の応答のため）。クライアントは `response.body.getReader()` で読み取りながら逐次表示する。
   - 回答は取得済みの `Restaurant` の構造化フィールド（`room` / `quiet` / `prestige` / `service` / `budgetLabel` / `access` / `matchingSummary` / `concerns` など）に基づかせる（`app/server/services/store-ask-prompt.ts` の `buildStoreAskPrompt`）。生の口コミ・写真・メニューのテキストは取得していないため、それらを根拠として持ち出さない。根拠がない場合は断定せず、不確実性を明示する。
   - ツール呼び出しが必要になった場合（例: 在庫 API を都度参照するなど）は、自前でループを書かず AI SDK の agent/tool 抽象を使う。

### プロンプト構築とセキュリティ

`docs/SECURITY.md` のプロンプトインジェクション対策を、AI SDK 実装では次のように具体化する。

- 店舗説明、口コミ、ユーザー自由入力は常に「データ」として扱い、system prompt やツール定義とは明確に分離する。
- プロンプトには生の長文をそのまま渡さず、`app/server/services/` で抽出・要約済みの根拠フィールドを渡す。
- ユーザー自由入力・店舗説明・口コミには長さ上限を設ける。上限は `app/server/services/` の入力検証で担保し、AI SDK 呼び出し側で無制限の文字列を受け付けない。
- 生成結果に含める引用テキストは短く制限し、隠しプロンプトや内部スコアリング式を出力させない。
- レート制限は route module の loader/action 側、または `app/server/clients/` のラッパーで行う。Google マップによるグラウンディングも同様に、1検索あたりの呼び出し回数の上限とキャッシュ優先で課金・レートを抑える。

### エラーハンドリングとフォールバック

`docs/RELIABILITY.md` の想定される失敗に対応するため、AI SDK 呼び出しは次を満たす。

- キャッシュ済みの検索結果を表示する場面では、他のAI呼び出し（オンデマンド型の質問応答など）がタイムアウト・失敗しても、比較・ナビゲーションは動作し続ける。
- 初回検索（キャッシュ未ヒット）でグラウンディングまたは構造化評価の呼び出しが失敗・タイムアウトした場合は、検索結果画面自体にエラー状態を明示する（`docs/RELIABILITY.md`）。空のカードや架空の店舗で埋めない。
- AI 呼び出しの失敗は例外を握りつぶさず、呼び出し元（`services`）で「AI データなし」の状態として扱い、UI 側に不確実性として伝える。
- 不確実性を自信のある言葉で埋め合わせない。生成に失敗した場合、根拠のない代替文言を生成しない。
- Google マップによるグラウンディングが失敗する、または該当0件の場合も、比較・ナビゲーションなど他の操作は使える状態を保ち、0件・取得失敗であることを明示する。

## 店舗データモデル

`docs/DESIGN.md` の店舗カード・比較表の表示項目（店舗名、ジャンル、エリア、予算、個室・席、代表写真、個室有無、AI マッチングポイント要約）を、`app/domain/models/restaurant.ts` のひとつのフラットな `Restaurant` 型として置く。店舗データは Google マップによるグラウンディングと AI 評価をまとめて一度に生成するだけなので、生データと AI 派生評価を型として分離しない。検索結果一覧、MAP、比較表、最終候補パネルはすべてこの型を参照し、画面ごとに別の形へ作り替えない。

`Restaurant` の型定義（フィールド、固定語彙 vs 自由記述の区別、null の意味）は `docs/MODEL.md` の「コンテキスト2: 店舗探索・評価」を正とする。このドキュメントでは実装配置とクライアント/サーバー境界だけを扱う。

当初は `AREA_REGIONS` / `BUDGET_STEPS`（相手種別・重視条件と同様、`app/mocks/data.ts` に定義されている）を `app/constants/` へ移設してから `Restaurant` 型の `area` / `budgetLabel` をそこから導出する型にする計画だったが、実装時には見送り、`area: string` / `budgetLabel: string | null` という素直な文字列型にした。`AREA_REGIONS` 等は現在も `app/mocks/data.ts` に置かれたままで、この移設は未実施。検索時のエリア→緯度経度変換だけを担う `app/constants/area-coordinates.ts` が、この `app/mocks/data.ts` の `AREA_REGIONS` を参照している。

`app/mocks/data.ts` の `Store` 型は `Restaurant & { pos, photoPlaceholderLabel }` で、`pos`（画面上の相対位置）と `photoPlaceholderLabel`（プレースホルダー用ラベル文字列）はプロトタイプ専用の追加フィールドとして残っている。実検索結果（`Restaurant`）はこの2つを持たないため、`StoreList` / `ResultsMap` / `CompareTable` / `StoreDetailScreen` はどちらの形でも描画できるよう、`pos` はオプショナル（無ければマーカー非表示）、`photoPlaceholderLabel` は `room` から `resolvePhotoPlaceholderLabel`（`app/utils/photo-placeholder-label.ts`）で都度導出する形にした。

### 各画面での対応

- 検索結果カード・比較表: `docs/DESIGN.md` の表示項目は、この `Restaurant` 型のフィールドから組み立てる。`genre` / `room` / `access` / `phone` など Google 由来・AI 生成フィールドが `null` の場合は「情報なし」等のフォールバック文言を表示し、`null` をそのまま描画しない。
- 最終候補パネル（`final-store-panel.tsx`）: `phone` / `access` を使う。ミニマップは現状もプレースホルダーのまま（`location` を使う実装への置き換えは「地図表示の実装」のとおり未着手）。
- MAP: `Restaurant.location` は現状すべて `null`（下記「店舗写真の取得」「地図表示の実装」の理由により）。そのため `ResultsMap` は実検索結果に対してはマーカーを描画せず、プレースホルダー背景のみを表示する。`pos.top/left` の相対配置を使うのはモック `Store` を渡した場合のみ。

## 店舗写真の取得（現状: 未実装、理由あり）

当初の方針は、店舗カード・比較表・最終候補パネルの代表写真を `Restaurant.photoUrl` に格納し、グラウンディング出力に含まれる写真参照（画像 URI、または Photo Media で解決可能なリソース名）だけから解決する、というものだった（Place Details など追加の Google API は叩かない前提）。

実装時に Gemini の Google マップによるグラウンディングの実際の応答を確認したところ、`providerMetadata.google.groundingMetadata.groundingChunks[].maps` には `uri` / `title` / `placeId` のみが含まれ、画像 URI・Photo Media リソース名のいずれも含まれていなかった。つまりこの方針が前提としていた「写真参照がグラウンディング出力に含まれる」というケースが現状のレスポンスには存在しない。

そのため:

- `app/server/clients/google-places.ts` は実装していない。写真参照の変換ロジックが動かす対象を持たないため。
- `Restaurant.photoUrl` は現状すべて `null`。店舗一覧・比較表・最終候補パネルは `StorePhotoPlaceholder`（`room` から `resolvePhotoPlaceholderLabel` で導出したラベル）に常時フォールバックする。
- 将来 Gemini 側の応答に写真参照が含まれるようになった場合は、上記の変換方針（画像 URI ならそのまま使う、リソース名のみなら `https://places.googleapis.com/v1/{photoName}/media` で解決する）が引き続き有効な設計であるため、そのときに `google-places.ts` を追加する。API キーは `GOOGLE_PLACES_API_KEY` を使う想定（`.env.example` には用意済みだが現状未使用）。
- 写真取得のためだけに Place Details など追加の Google API を呼ぶことはしない、という制約自体は変わらない。

### 信頼性・セキュリティ

- 写真の参照が無い場合も、店舗表示自体をブロックしない（`docs/RELIABILITY.md` の段階的表示方針に従う）。取得できない場合に根拠のない画像を生成・捏造しない。
- Google Places の API キーを使う実装を追加する際は、サーバー専用環境変数で管理し、クライアントに渡さない（`docs/SECURITY.md` のクライアント側セキュリティに従う）。

## 地図表示の実装（現状: 未着手）

検索結果画面の地図（現状は `results-map.tsx` によるプレースホルダー）を、将来 Google Map による実装に置き換える構想。`@vis.gl/react-google-maps` は依存関係として導入済みだが、まだ配線していない。

未着手のまま残っている理由: 「店舗写真の取得」と同様、Gemini のグラウンディング応答には座標（`location`）が含まれないことが実装時に判明した。そのため `Restaurant.location` は現状すべて `null` で、実際にマーカーを打てる座標データがまだ無い。地図を実装する前に、まず座標データをどう得るか（例: `placeId` から Geocoding / Place Details で別途解決する、など）を決める必要がある。以下の配置方針の検討はその座標データが揃った前提の設計として残す。

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

現時点ではデスクトップ幅を主眼にした外部配置を採用し、モバイル向けレイアウトは別途の検討事項として切り出す。

### 実装方針（外部配置）

- `results-screen.tsx` の Flexbox 構成（`StoreList` を左、`ResultsMap` を右）はそのまま維持する。
- `app/components/feature/results/results-map.tsx` のプレースホルダー実装を、実際の地図コンポーネントに置き換える。
- ライブラリは Google Maps JavaScript API の React バインディングを使う（例: `@vis.gl/react-google-maps`）。実装時に、その時点で Google が推奨するパッケージ・API（`<APIProvider>` / `<Map>` / advanced marker など）を必ず確認し、記憶にある古い API（非推奨の `@react-google-maps/api` や旧来の `google.maps.Marker` など）を使わない。
- マーカーの位置には `Restaurant.location`（実緯度経度）をそのまま使う。`location` が `null` の店舗はマーカーを表示せず、架空の位置を作らない。
- マーカーと店舗カードの連動（マーカークリックで対応カードをハイライトする、カードのホバー・選択でマーカーをハイライトするなど）は、画面ローカルの選択状態、または既存の `compareIds` 選択状態を流用して実装する。
- 地図の初期表示範囲は、ヒアリングのエリア座標（候補探索で使う緯度経度）を中心にするか、取得した店舗群の座標に合わせて調整する。

### API キーの扱い

- 地図表示はクライアント（ブラウザ）で Google Maps JavaScript API を読み込むため、サーバー専用キーとは別の、ブラウザ向け API キーを用意する。実装済みの Gemini グラウンディングは Gemini 自身の機能（`GOOGLE_GENERATIVE_AI_API_KEY` のみ）で完結しており、独立した `GOOGLE_MAPS_API_KEY` は不要だった（写真解決用に用意した `GOOGLE_PLACES_API_KEY` も上記のとおり現状未使用）。
- このプロジェクトのビルドツールは Vite（`@react-router/dev` 経由）のため、クライアントに埋め込む環境変数は `VITE_` プレフィックスを付けたものだけがバンドルに含まれる（`VITE_GOOGLE_MAPS_BROWSER_KEY`。`.env.example` には用意済みだが地図表示が未着手のため現状未使用）。無プレフィックスのサーバー専用キーとは明確に分ける。
- ブラウザ向け API キーは Google Cloud Console 側で HTTP リファラー制限をかけ、想定外のドメインから使われないようにする。

### 信頼性

- Google Maps JavaScript API の読み込みに失敗した場合も、店舗一覧・比較・ナビゲーションなど他の機能はブロックしない（`docs/RELIABILITY.md` の段階的表示方針）。地図部分だけエラー表示・再試行導線にする。

## 現在の機能領域

機能コンポーネント:

- トップ: `app/components/feature/top/`
- ヒアリング: `app/components/feature/hearing/`
- 検索結果: `app/components/feature/results/`
- 店舗詳細: `app/components/feature/store-detail/`
- 比較: `app/components/feature/compare/`
- 予約導線受け渡し: `app/components/feature/reservation-handoff/`（未実装。`/reservation-handoff` 参照）
- レイアウト: `app/components/feature/layout/`

共有状態:

- Jotai atom と操作用 hook: `app/state/`

サーバー専用コード（実装済み）:

- AI クライアントの薄いラッパー: `app/server/clients/`（`gemini-grounding.ts` / `gemini-evaluation.ts` / `gemini-ask.ts`）
- ユースケース単位の処理: `app/server/services/`（`restaurant-search.ts` / `restaurant-search-query.ts` / `store-ask-prompt.ts`）
- キャッシュ: `app/server/repositories/`（`restaurant-cache.ts`、プロセス内メモリのみで永続化しない）

モックデータ、定数、ユーティリティ:

- モック店舗・検索データ、および相手種別・重視条件・エリアなどの選択肢定数: `app/mocks/data.ts`（`AREA_REGIONS` 等の `app/constants/` への移設は未実施、上記「店舗データモデル」を参照）
- エリア→緯度経度の変換など、実検索で使う定数: `app/constants/`
- theme token・スタイル計算: `app/styles/`
- 汎用純粋関数: `app/utils/`

## 状態モデル

予約・検索状態は Jotai で管理する。

実装方針:

- 状態の本体は `bookingAtom` に置く。
- 初期値は `initialBookingState` として定義する。
- 画面コンポーネントは `useBooking()` から状態と操作を取得する。
- `BookingProvider` は Jotai の store スコープを作るために `app/root.tsx` でアプリ全体を包む。
- ルートモジュールには状態更新ロジックを置かず、`app/state/booking-context.tsx` に集約する。

主な状態グループ:

- 検索基本条件: 選択エリア、日付、時刻、人数
- 会食文脈: 相手種別、相手に関する自由入力
- 予算: 下限、上限、自由入力
- 重視条件: 最大3つの優先条件キー、任意の自由入力
- 比較: 選択した店舗 ID、最終候補の店舗 ID

インタラクション制約:

- 重視条件は最大3つまで。
- 比較候補は最大5件まで。
- 通常の比較フローでは、2件以上の選択を必要とする。
- 最終候補の選択はトグルできる。

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
- 比較に追加する操作
- 比較トレイ

### 比較

選択した候補を一貫した比較表で表示する。個別カードよりも違いが明確になることを優先する。

最終候補を選択したら、共有しやすい説明エリアを表示または有効化する。

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

- 店舗詳細は `/stores/:storeId` に統一し、単数形の `/store/:storeId` は使わない。
- 予約前確認や外部予約への受け渡しは `/reservation-handoff` に置く。
- 画面固有の UI 実装は `app/components/feature/<area>/` に置き、ルートモジュールは接続層に留める。

## 検証コマンド

コード構成、ルート、状態管理、UI、サーバー境界を変更した後は以下を実行する。

```bash
pnpm run typecheck
pnpm build
```

ルート変更時に確認する画面（`/reservation-handoff` は未実装のため対象外）:

- `/`
- `/hearing`
- `/results`
- `/compare`
- `/stores/:storeId`

AI SDK のバージョンアップやプロバイダー変更を行った場合は、`/results` の AI 評価表示と `/stores/:storeId` の質問応答を実際に確認する。
