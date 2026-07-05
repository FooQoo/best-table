# アーキテクチャ

このドキュメントは、Best Table のコード配置、実行境界、主要モジュールの責務を説明する codemap です。

目的は、変更したい内容に対して「どこを見ればよいか」「どこに置くべきか」を判断しやすくすることです。実装詳細や画面仕様は `docs/DESIGN.md`、実装順序は `docs/PLANS.md` に分けます。

## 技術スタック

- React Router Framework Mode
- `@react-router/fs-routes` によるファイルベースルーティング
- React 19
- TypeScript
- Jotai
- Tailwind CSS
- shadcn 風のローカル UI コンポーネント
- AI SDK (`ai` パッケージ, Vercel) + `@ai-sdk/google`（Gemini）
- Google Places API (New) — 店舗写真の取得（AI SDK を介さない直接の REST 呼び出し）
- Google Maps JavaScript API（React バインディング経由）— 検索結果画面の地図表示

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
| `/reservation-handoff` | `app/routes/_layout.reservation-handoff.tsx` | 外部予約導線または予約前確認への受け渡し |

上記を実装予定の正式なパス設計とする。初期実装で画面が未完成の場合でも、追加時はこの URL とルートモジュール名に合わせる。

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
- 店舗候補の探索には、自前で Google Maps Places API を呼ぶ tool を実装するのではなく、Gemini の「Google マップによるグラウンディング」機能（`Tool(google_maps=GoogleMaps())` と `tool_config.retrieval_config.lat_lng`）を使う。詳細は下記「検索・評価型」を参照。
- Gemini の API キーはサーバー専用環境変数（例: `GOOGLE_GENERATIVE_AI_API_KEY`）で管理し、`app/server/clients/` 以外からは参照しない。
- 構造化出力のスキーマ定義には zod を使い、`app/domain/models/` の型と対応させる。
- 実装時は記憶にある API を使わない。`ai` パッケージ・`@ai-sdk/google` 導入後は `node_modules/ai/docs/` と `node_modules/@ai-sdk/google/docs/` を参照し、インストール済みバージョンの API で書く。モデル ID（`gemini-*`）も記憶で決め打ちせず、実装時点の最新一覧で確認する。

### 実行境界: AI 処理はサーバー専用

AI 処理はすべてサーバー側で完結させ、ブラウザに API キーやプロンプト構築ロジックを渡さない。上記の Client/Server 境界に従い、以下に責務を分ける。

- `app/server/clients/`: 外部サービスとの低レベル接続。AI SDK の呼び出しそのもの（`generateText` / `generateObject` / `streamText` など、Google マップによるグラウンディングを使う呼び出しを含む）と、Google Places の写真関連 REST 呼び出し（`google-places.ts`、詳細は「店舗写真の取得」）を薄いラッパーとして置く。プロバイダー設定・モデル ID・API キー参照はここに閉じ込める。
- `app/server/services/`: ユースケース単位の処理（検索・評価、質問応答など）。プロンプトの組み立てや、グラウンディングの入力（緯度経度など）の用意はここで行い、`clients` の関数を呼ぶ。
- `app/server/repositories/`: 完成済みの `Restaurant` データ、AI 評価キャッシュ、検索候補キャッシュの取得・保存。外部 API は呼ばず、保存・取得だけを担当する。

### ユースケース別の使い方

Best Table の AI ユースケースは大きく2種類に分かれ、それぞれ扱いを変える。

1. 検索・評価型（Gemini の Google マップによるグラウンディング + 構造化評価）: ヒアリング条件に合いそうな店舗を探し、AI 評価まで含めた `Restaurant[]` を1回の検索でまとめて生成する。参考: [Gemini Enterprise Agent Platform: Google マップによるグラウンディング](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-google-maps)。

   トリガーはヒアリング完了後の検索実行。受け口は React Router の route module（`_layout.results.tsx` の `loader` が、エリア・日時・人数・予算・重視条件・会食文脈などのヒアリング条件をクエリパラメータとして受け取る、または `_layout.hearing.tsx` の `action` から検索条件を渡す）とし、外部 API サーバーを別途立てない。

   内部的には性質の異なる2つの呼び出しを `app/server/services/` の中で直列に実行するが、ユーザーからは1回の検索としてまとめて結果が返る。**基本の店舗一覧を先に表示してから AI 評価を後埋めする、という段階表示にはしない**（このユースケース自体が最初から AI 生成であるため）。

   a. グラウンディング呼び出し（候補収集）
      - 自前で Google Maps Places API を呼ぶ tool は実装しない。代わりに Gemini API 呼び出し時に `Tool(google_maps=GoogleMaps())` を指定し、`tool_config.retrieval_config.lat_lng` に緯度経度を渡すことで、Gemini に地理空間データを直接参照させる（グラウンディングタイプは `places` を使う。`routing` は限定公開プレビューのため使わない）。
      - 位置情報は緯度経度でしか渡せない。ヒアリングのエリア選択（`selectedAreas`、例: 銀座、六本木）は `app/constants/` に持つ固定のエリア→緯度経度対応表で変換してから渡す。現状エリアは固定選択肢のため静的な対応表で十分とし、エリアが自由入力・動的になった場合のみ Geocoding API 等の追加変換を検討する。
      - `@ai-sdk/google`（AI SDK 経由）でこの Google マップ グラウンディングを指定できるかは、実装時に必ず `node_modules/@ai-sdk/google/docs/` とソースで確認する。対応していない場合に限り、この用途だけ `app/server/clients/` 内で Google 公式 SDK（`google-genai` 系）を直接使う薄いラッパーを許容する。他プロバイダーへの依存にはしない。
      - この呼び出しは自由文生成（`generateText` 系）で行う（グラウンディングを使う都合上、構造化出力の `generateObject` とは併用しない）。回答本文と、レスポンスに含まれるグラウンディングメタデータ（該当ページ確認時点では正確なフィールド名・構造は未確定）の両方から店舗候補（名称・住所・位置・写真参照など）を抽出し、`app/domain/models/` の `Restaurant` 型（詳細は下記「店舗データモデル」）の Google 由来フィールドに変換する。グラウンディングメタデータに現れない店舗を AI に作文させない。
      - グラウンディングメタデータに Place ID 相当の参照（例: Maps の place リソース名や ID）が含まれる場合は、それを `Restaurant.placeId` としてそのまま保持する。実装時にメタデータの実際のフィールド名・構造を確認し、抽出できる識別子を取りこぼさないようにする。
      - 候補の代表写真は、グラウンディング出力に含まれる写真参照だけから解決する（詳細は「店舗写真の取得」節）。写真のために追加の検索・詳細取得はしない。
      - 目標件数は30件。Gemini が返す候補がそれに満たない場合は取得できた件数のまま返し、水増しはしない。
   b. 構造化評価呼び出し（AI 評価の生成）
      - a. で得た候補一覧とヒアリング条件をもとに、`generateObject`（zod スキーマ）で `Restaurant` 型の AI 生成フィールド（`score` / `room` / `quiet` / `prestige` / `service` / `budgetLabel` / `concerns` / `matchingSummary` / `evidence` / `confidence` / `generatedAt`）を構造化データとして生成する。フリーテキストの後処理パースに頼らない。
      - 個室有無・接待向きかどうかなど、Google マップ側にないプロダクト固有の評価軸は、この呼び出しで初めて生成する（a. では扱わない）。

   - 検索結果（a. と b. をまとめた `Restaurant[]`）は、正規化したヒアリング条件（エリア座標・日時・人数・予算・重視条件・会食文脈の相手種別）から作るキーで `app/server/repositories/` にキャッシュする。同一条件での再検索はキャッシュから即座に返す（`docs/RELIABILITY.md` の段階的表示）。キャッシュされる `Restaurant` には相手種別に依存する AI 評価が含まれるため、相手種別をキーから外さない。
   - Gemini の呼び出しには利用回数の上限がある（例: 一部モデルで Google マップによるグラウンディングは1日あたり5,000クエリ）。キャッシュ優先と1検索あたりの呼び出し回数の抑制で、この上限と課金を管理する。
   - a., b. のどちらが失敗・タイムアウトした場合も、`docs/RELIABILITY.md` の想定される失敗と、このドキュメントの「エラーハンドリングとフォールバック」に従う。

2. オンデマンド型（店舗詳細の質問応答）: 店舗詳細ページでのユーザーの質問応答。
   - 受け口は React Router の route module。同一ルートの `action`、または UI を持たない resource route（例: `api.stores.$storeId.ask.tsx` -> `/api/stores/:storeId/ask`）を新設し、そこから `app/server/services/` を呼ぶ。外部 API サーバーを別途立てない。
   - `streamText` を使ってよいが、UI 全体を AI ファーストのチャットにはしない（`docs/DESIGN.md` のガードレール）。質問はあらかじめ用意された定型質問または短い自由入力に限定する。
   - ストリーミング応答を返す場合、resource route の `action` から `Response`（AI SDK のストリームヘルパー経由）を直接返す。
   - 回答は店舗データ・口コミ・写真・席情報・メニューなど、取得済みの根拠フィールドに基づかせる。根拠がない場合は断定せず、不確実性を明示する。
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

`docs/DESIGN.md` の店舗カード・比較表の表示項目（店舗名、ジャンル、エリア、予算、個室・席、代表写真、個室有無、AI マッチングポイント要約）と、現行モック（`app/mocks/data.ts` の `Store` 型、および `store-list.tsx` / `compare-table.tsx` / `final-store-panel.tsx` の実際の参照フィールド）を突き合わせて確認した。店舗データは Google マップによるグラウンディングと AI 評価をまとめて一度に生成するだけなので、生データと AI 派生評価を型として分離せず、`app/domain/models/restaurant.ts`（仮）にひとつのフラットな `Restaurant` 型として置く。検索結果一覧、MAP、比較表、最終候補パネルはすべてこの型を参照し、画面ごとに別の形へ作り替えない。

`app/domain/models/**` は `app/mocks/**`（プロトタイプ用のモックデータ置き場）に依存させない（`app/` 配下のフォルダ構成のとおり、`domain/models` はプロトタイプ・本番の両方から参照される共用の型置き場のため）。そのため、`Restaurant` 型を作る前に `AREA_REGIONS` / `BUDGET_STEPS` を `app/mocks/data.ts` から `app/constants/` へ先に移設し、`Restaurant` 型はその移設後の `app/constants/` から import する。

`Restaurant` の型定義（フィールド、固定語彙 vs 自由記述の区別、null の意味）は `docs/MODEL.md` の「コンテキスト2: 店舗探索・評価」を正とする。このドキュメントでは実装配置とクライアント/サーバー境界だけを扱う。

フィールドはできるだけ現行モックの `Store` 型のキー名（`id` / `name` / `genre` / `area` / `score` / `room` / `quiet` / `prestige` / `service` / `access` / `concerns` / `phone`）に揃え、`compare-table.tsx` の `ROWS: { key: keyof Store }[]` のような既存の実装パターンを大きく崩さずに移行できるようにする。モックの `pos: { top, left }`（画面上の相対位置）は `location`（実緯度経度）に、`photo`（プレースホルダー用のラベル文字列）は `photoUrl` に置き換える対象とする。

### 各画面での対応

- 検索結果カード・比較表: `docs/DESIGN.md` の表示項目は、この `Restaurant` 型のフィールドから組み立てる。
- 最終候補パネル（`final-store-panel.tsx`）: `phone` / `access` / `location` を使う。現状のミニマップのプレースホルダーも `location` を使う実装に置き換える対象とする。
- MAP: `Restaurant.location` の実緯度経度を使う。`results-map.tsx` の `pos.top/left` による相対配置は、実座標を使う実装に置き換える対象とする。

## 店舗写真の取得

店舗カード・比較表・最終候補パネルの代表写真（現状は `StorePhotoPlaceholder` によるプレースホルダー表示）を、`Restaurant.photoUrl` に格納する。写真取得のためだけに Place Details など追加の Google API を叩くことはしない。あくまで「検索・評価型」（Google マップによるグラウンディング）が返す出力に含まれる情報だけを使う。

### 方針

- グラウンディングメタデータに写真の参照（画像 URI、または Photo Media で解決可能なリソース名）が含まれている場合のみ、`app/server/services/` でそれを `Restaurant.photoUrl` に変換する。
  - 直接利用可能な画像 URI が含まれる場合は、それをそのまま `photoUrl` に設定する。
  - リソース名（URL ではない識別子）しか含まれない場合に限り、`https://places.googleapis.com/v1/{photoName}/media`（`maxWidthPx` / `maxHeightPx` / `skipHttpRedirect=true` を付与）を呼んで実画像 URI に変換する。この変換は「グラウンディング結果に既にある情報を使える形にするだけ」であり、店舗を探す・Place ID を確保するための新たな検索や詳細取得ではない。
- グラウンディングメタデータに写真の参照が含まれない場合は、`photoUrl` を `null` のままにする。写真を得るためだけに Place Details や他の Places API を追加で呼び出さない。
- 実装時は、グラウンディングメタデータの実際のフィールド構成（画像 URI が直接含まれるか、リソース名のみか、あるいは写真情報自体が無いか）を必ず確認したうえで上記のどちらに該当するかを判断する（現時点では未確定）。

### 実装場所とキャッシュの注意点

- 上記の変換（リソース名 → 実画像 URI）が必要な場合、その REST 呼び出しは `app/server/clients/google-places.ts`（仮）にまとめる。外部 API との低レベル接続は `clients` の責務であり（`server/services` と `server/repositories` の使い分け）、`app/server/repositories/` には REST 呼び出しを書かない。API キーは `GOOGLE_PLACES_API_KEY`（未設定なら「検索・評価型」で使う `GOOGLE_MAPS_API_KEY` にフォールバック）とし、`app/server/clients/` 以外からは参照しない（Gemini 用キーの扱いと同じルール）。
- `app/server/services/` で店舗候補と AI 評価を組み立てる際に、`app/server/clients/google-places.ts` を呼んで写真解決も合わせて行い、完成した `Restaurant` オブジェクトの一部として `app/server/repositories/` にキャッシュする。`repositories` はこの完成済みオブジェクトの保存・取得だけを担当し、外部 API は呼ばない。取得失敗時も例外を投げず `photoUrl: null` を返す。
- 画像 URI（グラウンディング由来・Photo Media 由来のいずれも）は無期限ではなく一定時間で失効しうる。`Restaurant` レコード全体のキャッシュ TTL をこの失効期間より短く保つか、表示側で画像読み込み失敗（`<img>` の `onerror`）を検知したときに `StorePhotoPlaceholder` へフォールバックすることで、期限切れによる崩れた表示を防ぐ。

### クライアント側の表示方針

- 店舗一覧・比較表・最終候補パネルは、`restaurant.photoUrl` があればそのまま `<img>` で表示し、`null` または画像読み込み失敗時は既存の `StorePhotoPlaceholder` にフォールバックする。取得のための追加 fetch は画面側で行わない。
- Google 由来の写真を表示する場合は、Google の利用規約に従い「Powered by Google」等の帰属表示を写真上に重ねる。

### 信頼性・セキュリティ

- 写真の参照が無い・失敗した場合も、店舗表示自体をブロックしない（`docs/RELIABILITY.md` の段階的表示方針に従う）。取得できない場合に根拠のない画像を生成・捏造しない。
- Google Places の API キーはサーバー専用環境変数で管理し、クライアントに渡さない（`docs/SECURITY.md` のクライアント側セキュリティに従う）。

## 地図表示の実装

検索結果画面の地図（現状は `results-map.tsx` によるプレースホルダー）を、Google Map による実装に置き換える。

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

- 地図表示はクライアント（ブラウザ）で Google Maps JavaScript API を読み込むため、サーバー専用の Gemini・Places 用キーとは別の、ブラウザ向け API キーを用意する。
- このプロジェクトのビルドツールは Vite（`@react-router/dev` 経由）のため、クライアントに埋め込む環境変数は `VITE_` プレフィックスを付けたものだけがバンドルに含まれる（例: `VITE_GOOGLE_MAPS_BROWSER_KEY`）。`GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACES_API_KEY` など無プレフィックスのサーバー専用キーとは明確に分ける。
- ブラウザ向け API キーは Google Cloud Console 側で HTTP リファラー制限をかけ、想定外のドメインから使われないようにする。

### 信頼性

- Google Maps JavaScript API の読み込みに失敗した場合も、店舗一覧・比較・ナビゲーションなど他の機能はブロックしない（`docs/RELIABILITY.md` の段階的表示方針）。地図部分だけエラー表示・再試行導線にする。

## 現在の機能領域

機能コンポーネント:

- トップ: `app/components/feature/top/`
- ヒアリング: `app/components/feature/hearing/`
- 検索結果: `app/components/feature/results/`
- 店舗詳細: `app/components/feature/stores/`
- 比較: `app/components/feature/compare/`
- 予約導線受け渡し: `app/components/feature/reservation-handoff/`
- レイアウト: `app/components/feature/layout/`

共有状態:

- Jotai atom と操作用 hook: `app/state/`

モックデータ、定数、ユーティリティ:

- モック店舗・検索データ: `app/mocks/`
- 画面選択肢・固定ラベル: `app/constants/`
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

ルート変更時に確認する画面:

- `/`
- `/hearing`
- `/results`
- `/compare`
- `/stores/:storeId`
- `/reservation-handoff`

AI SDK のバージョンアップやプロバイダー変更を行った場合は、`/results` の AI 評価表示と `/stores/:storeId` の質問応答を実際に確認する。
