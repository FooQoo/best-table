# AI処理

このドキュメントは、Best Table の AI 処理（AI SDK の実装ルール、Gemini のモデル選定、ユースケース別のプロンプト構築、AI 生成フィールドの制約、エラーハンドリング）の一次情報源です。

このドキュメントが扱わないもの:

- コード配置・Client/Server 境界・ルーティングなど実装配置全般 → `docs/ARCHITECTURE.md`
- `Restaurant` 型などドメインモデルの型定義・不変条件 → `docs/MODEL.md`
- AI 以外を含む信頼性の一般方針（段階的表示、データ鮮度、想定される失敗） → `docs/RELIABILITY.md`
- プロンプトインジェクション対策・出力安全性・アクセス境界の全体方針 → `docs/SECURITY.md`

## 採用ライブラリ

- AI SDK (`ai` パッケージ, Vercel) を LLM 呼び出しの共通レイヤーとして採用する。
- モデルプロバイダーは Google Gemini を採用し、`@ai-sdk/google` provider package 経由で接続する。他プロバイダーへの直書きや、provider 固有 SDK（`@google/generative-ai` など）への直接依存はしない。
- 店舗候補の探索は Gemini のグラウンディング機能ではなく、Places API (New) の Text Search（`places:searchText`）を直接呼ぶ。理由は「ユースケース別の使い方」の検索・評価型を参照。AI（Gemini）は探索結果に対する構造化評価だけを担う。
- Gemini の API キーはサーバー専用環境変数（例: `GOOGLE_GENERATIVE_AI_API_KEY`）で管理し、`app/server/clients/` 以外からは参照しない。
- 構造化出力のスキーマ定義には zod を使い、`app/domain/models/` の型と対応させる。
- 実装時は記憶にある API を使わない。`ai` パッケージ・`@ai-sdk/google` 導入後は `node_modules/ai/docs/` と `node_modules/@ai-sdk/google/docs/` を参照し、インストール済みバージョンの API で書く。モデル ID（`gemini-*`）も記憶で決め打ちせず、実装時点の最新一覧で確認する。

## 実行境界: AI処理はサーバー専用

AI 処理はすべてサーバー側で完結させ、ブラウザに API キーやプロンプト構築ロジックを渡さない。`docs/ARCHITECTURE.md` の Client/Server 境界に従い、以下に責務を分ける。

- `app/server/clients/`: 外部サービスとの低レベル接続。AI SDK の呼び出しそのものを薄いラッパーとして置く（`gemini-evaluation.ts`: `generateObject` による構造化評価、`gemini-results-chat.ts`: `streamText` による地図コンテキスト相談、`gemini-results-chat-suggestions.ts`: `generateObject` によるおすすめ質問生成）。`google-places.ts` は Places API (New) の Text Search（`searchPlacesByText`）と Place Photos の REST 呼び出しを実装し、施設検索と代表写真の取得を担う（詳細は `docs/ARCHITECTURE.md`「店舗写真の取得」参照）。プロバイダー設定・モデル ID・API キー参照はここに閉じ込める。
- `app/server/services/`: ユースケース単位の処理（検索・評価、質問応答など）。検索クエリ・プロンプトの組み立てはここで行い、`clients` の関数を呼ぶ。
- `app/server/repositories/`: 完成済みの `Restaurant` データの取得・保存境界。外部 API は呼ばず、保存・取得だけを担当する（現時点でキャッシュ実装は無く、mock/real 切り替えの `restaurant-search-repository.ts` / `photo-repository.ts` のみ）。

## モデル選定とレイテンシ方針

Gemini モデル ID は `app/server/clients/gemini-models.ts` に集約する。検索結果の構造化評価（`GEMINI_EVALUATION_MODEL_ID`）は `gemini-3.5-flash` で判断品質を優先し、地図コンテキスト AI チャット（回答本文・おすすめ質問、`GEMINI_CHAT_MODEL_ID`）は `gemini-3.1-flash-lite` で低レイテンシ・低コストを優先する。両方とも Flash 系だが、用途に応じて別モデルを使い分ける。

AI 応答速度を上げるため、次の方針を取る。

- 地図コンテキスト AI チャットは `streamText` のままにし、全文生成完了を待たずに逐次表示する。
- チャット回答は `maxOutputTokens` と prompt 上の行数制限で短く保つ。長文回答より、比較・懸念・次アクションに絞った回答を優先する。
- 回答後のおすすめ質問生成は `timeout` と `maxRetries: 0` を設定し、遅い場合は deterministic な候補に即フォールバックする。
- クライアントが回答生成を中断した場合は `request.signal` を AI SDK に渡し、不要な生成を続けない。

これらの応答速度方針が支える段階的表示・想定される失敗時の振る舞いは `docs/RELIABILITY.md` を参照。

## 処理フロー図

### 1. 検索・評価型フロー（ヒアリング → 検索結果）

```
┌─────────────────────────┐
│   ヒアリング完了        │
│ (相手・予算・重視条件)   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│          POST /api/restaurants/search/stream                │
│        (BookingRequest を body に含める)                     │
└────────────┬────────────────────────────────────────────────┘
             │
        (NDJSON ストリーム)
             │
       ┌─────▼─────┐
       │    a.    │
       │ 施設検索  │  (Places API Text Search)
       │(決定的)   │  → `{ "type": "phase", "phase": "searching" }`
       └─────┬─────┘  → `{ "type": "restaurant", ... }` × N
             │        (Google由来フィールドのみ。AI生成フィールドはnull)
             │
        【表示時点】
        一覧に店舗カード先行表示
        ← AI評価を待たずに見える
             │
       ┌─────▼──────┐
       │     b.     │
       │構造化評価   │  (Gemini generateObject)
       │(品質優先)   │  → `{ "type": "phase", "phase": "evaluating" }`
       └─────┬──────┘  → `{ "type": "restaurant-evaluated", ... }` × N
             │        (AI生成フィールドが埋まった状態)
             │
        【反映時点】
        既存カードの内容を店舗単位で更新
        ← マッチ度・懸念点・要約が後から反映される
             │
       ┌─────▼──────────┐
       │  完了通知      │
       │ { "type":      │
       │   "done", ... }│
       └────────────────┘
```

**特徴**
- a. と b. は直列実行（探索が完了してから評価を開始）
- 一覧は AI 評価を待たずに先に表示される（段階的表示）
- 並び順は施設検索結果の順のまま固定（AI評価の到着順では並び替えない）

---

### 2. オンデマンド型フロー（地図上での質問応答）

```
┌──────────────────────────────┐
│    ユーザーが地図で質問      │
│  (表示中店舗に対する相談)    │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│    POST /api/results/chat                   │
│ • 表示中Restaurant[]                        │
│ • ヒアリング条件の要約                       │
│ • 質問文（短い自由入力またはFAQ）           │
└────────────┬──────────────────────────────────┘
             │
        (テキスト ストリーム)
             │
       ┌─────▼──────────┐
       │  AI回答        │
       │ (Gemini        │
       │  streamText)   │
       │  低レイテンシ  │
       │  優先モデル    │
       └─────┬──────────┘
             │
        【逐次表示】
        回答本文を流れる字で表示
        ← 全文生成完了を待たない
             │
       ┌─────▼──────────────────┐
       │ POST /api/results/chat/ │
       │        suggestions      │
       │ (回答が完了した後)       │
       └─────┬──────────────────┘
             │
       ┌─────▼──────────┐
       │ おすすめ質問   │
       │ 4件を生成      │
       │ (失敗時は      │
       │  deterministic │
       │  フォールバック)│
       └────────────────┘
```

**特徴**
- 質問は短く、AI ファーストではない（FAQ / おすすめ質問から選ぶのが主体）
- 回答は `streamText` で逐次表示（ユーザーが最後まで待たない）
- おすすめ質問生成は低優先度（遅い場合は固定候補に即フォールバック）

---

## ユースケース別の使い方

Best Table の AI ユースケースは大きく2種類に分かれ、それぞれ扱いを変える。

1. 検索・評価型（Places API 施設検索 + Gemini 構造化評価）: ヒアリング条件に合いそうな店舗を探し、AI 評価まで含めた `Restaurant[]` を1回の検索でまとめて生成する。

   施設検索（a.）は Gemini のグラウンディングではなく Places API (New) の Text Search を直接呼ぶ。以前は Gemini の Google マップによるグラウンディングを使っていたが、そのグラウンディングは自由文生成の副産物として候補を得る仕組みのため非決定的で、レイテンシが大きく（30件分の説明文をモデルに生成させていた）、「もっと読み込む」でページングのたびに再実行すると候補の重複・欠落が起きる問題があった。Places API を直接呼ぶ構成に変更したことで、同一条件・同一 `pageSize` なら常に同じ順序の候補が返る（決定的）ため、キャッシュを持たずにページごとに呼び直しても重複・欠落が起きない。

   トリガーはヒアリング完了後の検索実行。受け口は画面を持たない resource route `app/routes/api.restaurants.search.stream.tsx`（`/api/restaurants/search/stream`）の `action` で、`_layout.results.tsx`（`results-screen.tsx`）は URL query state から復元した検索条件を `fetch` の POST body として渡す。`mvp-cycle-5` では、検索条件は Jotai だけに閉じず `nuqs` による URL query state を復元元にする。外部 API サーバーは別途立てない。

   内部的には性質の異なる2つの呼び出しを `app/server/services/restaurant-search.ts` の `streamRestaurants` の中で直列に実行する。応答は改行区切り JSON（NDJSON）のストリームで、`{ type: "phase", phase: "searching" }` → 施設検索が確定した店舗ごとの `{ type: "restaurant", restaurant }`（AI生成フィールドは null）→ `{ type: "phase", phase: "evaluating" }` → AI評価が確定した店舗ごとの `{ type: "restaurant-evaluated", restaurant }`（同じ `id`、AI生成フィールドが埋まった状態）→ `{ type: "done", fromCache, hasMore, nextOffset }` の順に流れる。**基本の店舗一覧は AI 評価を待たずに先に表示し、AI 評価（マッチ度含む）は後から店舗単位で反映する**（以前は a. の施設検索と b. の構造化評価を常にセットで1店舗分として届けていたが、この設計は撤回した）。クライアントは `response.body.getReader()` で1行ずつ読み、`restaurant` イベントは `appendRestaurants` で一覧へ追加、`restaurant-evaluated` イベントは `updateRestaurant` で同じ `id` の既存エントリを差し替える。一覧の並び順は施設検索（Places API）が返した順のまま固定し、AI評価の到着順では並び替えない（並び替えるとカードが飛び跳ねるため）。店舗カード形状のスケルトンは `phase: searching` の候補探索中だけ表示し、`phase: evaluating` の AI評価中は追加表示しない。検索中は `SearchPhaseStatus`（`app/components/feature/results/search-phase-status.tsx`）が現在のフェーズと完了件数（`getSearchPhaseMessage`、`app/utils/search-phase-message.ts`。完了件数は `restaurant-evaluated` の到着数を数える）を表示し、比較トレイ等のナビゲーションはブロックしない。mock mode（`MODE=mock`）では `phase: searching` → 全店舗の基本形（AI生成フィールドを null 化したもの）を `restaurant` として送信 → `phase: evaluating` → 元のフィクスチャ（評価済み）を `restaurant-evaluated` として1件ずつ間隔を空けて送信、という同じ2段階の流れを模する。

   非ストリーム版の `app/routes/api.restaurants.search.tsx`（`/api/restaurants/search`）も実装として残っているが、現在 UI からは呼ばれない。`app/mocks/fixtures/restaurants-search.json` フィクスチャを再生成する際に直接 POST する用途にのみ使う（詳細は `docs/ARCHITECTURE.md`「mock mode」）。

   a. 施設検索（候補収集、`app/server/clients/google-places.ts` の `searchPlacesByText`）
      - Places API (New) の Text Search（`POST /v1/places:searchText`）を呼ぶ。`textQuery` は通常検索ではエリア名 + 「接待」「レストラン」+ 重視条件の短いキーワード（`app/server/services/restaurant-search-query.ts` の `buildPlaceSearchQuery`）にする。地図の「このエリアを検索」では旧エリア名を `textQuery` から外し、「接待」「レストラン」+ 重視条件にして、地図中心座標を `locationBias.circle` に渡す。通常検索の緯度経度はヒアリングのエリア選択を `app/constants/area-coordinates.ts` の固定対応表で変換する（`resolveAreaLatLng`）。現状エリアは固定選択肢のため静的な対応表で十分とし、エリアが自由入力・動的になった場合のみ Geocoding API 等の追加変換を検討する。
      - フィールドマスクは `GOOGLE_PLACES_SEARCH_FIELD_MASK`（`app/server/clients/google-places.ts`、内容は `docs/ARCHITECTURE.md`「Text Search の FieldMask 方針」を参照）。1回のレスポンスで店舗名・`placeId`・住所・座標・電話・代表写真参照・ジャンルまでまとめて取得できるため、以前のグラウンディング構成にあった候補ごとの Place Details 呼び出しは不要になった。応答に現れた店舗だけを候補にし、該当が少ない場合は水増しせずそのまま返す。
      - `pageSize` は Text Search 1回あたり最大20件（API 側の上限）。`offset + limit`（既定は10、最大20）を要求し、`offset:offset+limit` でスライスして返す。`offset + limit` が20を超えるページ（3ページ目以降）には対応していない（`pageToken` による継続取得は未実装）。
      - `placeId` は Text Search の `id`（`"ChIJ..."` 形式）を `"places/ChIJ..."` に正規化してから保持する。そのまま `Restaurant.id` に使うと URL セグメントと衝突するため、`buildRestaurantId` で `/` を `_` に置換してから `id` に使う。`placeId` フィールド自体は `"places/..."` 形式のまま保持する。
      - `displayName` / `nationalPhoneNumber` を含めると Place Details 単体運用時より高い SKU ティアに乗る可能性がある（要確認）。店舗名の取得自体が Text Search では必須のため避けられないが、実装・運用時に [Places API 料金ページ](https://developers.google.com/maps/billing-and-pricing/pricing)で実際の SKU・無料枠を確認すること。
   b. 構造化評価呼び出し（AI 評価の生成）
      - a. で得た候補一覧（店舗名のみ）とヒアリング条件をもとに、`generateObject`（zod スキーマ、`app/domain/models/restaurant-evaluation-schema.ts`）で `Restaurant` 型の AI 生成フィールド（`room` / `quiet` / `prestige` / `service` / `budgetLabel` / `concerns` / `matchingSummary` / `evidence` / `confidence` / `generatedAt`）を構造化データとして生成する（`app/server/clients/gemini-evaluation.ts`）。フリーテキストの後処理パースに頼らない。
      - 個室有無・接待向きかどうかなど、Places API 側にないプロダクト固有の評価軸は、この呼び出しで初めて生成する（a. では扱わない）。
      - AI評価プロンプトに渡すのは店舗名とヒアリング条件のみに限定する（`buildEvaluationPrompt`、`app/server/services/restaurant-search.ts`）。住所・電話・評価点・口コミ要約などPlaces API由来のデータは意図的に含めない。理由は Google Maps Platform 利用規約上の帰属表示義務にある。特に `reviewSummary`（口コミ要約）はGoogleが「Summarized with Gemini」の開示表示と `reviewsUri` へのリンクを display 用途に義務付けており、これを別のAIモデルへの入力として加工し帰属表示なしで自社評価文として表示することへの明示的な許可が見当たらないため、この用途では使わない方針にした（過去に検証し撤回した経緯があるので再導入する場合は法務確認必須）。詳細は下記「AI評価プロンプトの入力範囲」を参照。
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

## AI評価プロンプトの入力範囲

`buildEvaluationPrompt`（`app/server/services/restaurant-search.ts`）がGeminiに渡すのは、店舗名（候補一覧の番号付きリスト）とヒアリング条件（エリア・日時・人数・相手・予算・重視条件）のみ。住所・電話・評価点・口コミはPlaces APIから取得していても評価プロンプトには含めない。これはGoogle Maps Platform Content（特に口コミ由来のデータ）を自社AIの入力として加工し、帰属表示なしで独自の評価文として画面に表示することが利用規約上グレーゾーンだと判断したため（一度 `rating`/`userRatingCount`/`reviewSummary` を評価根拠として実装したが、法務確認前に撤回した経緯がある）。住所・電話は店舗カード・詳細パネルの表示にのみ使う。

この方針が Places API 施設検索のフィールドマスク選定（`rating`/`reviews`/`reviewSummary` を取得しない理由の一つ）にも影響している。フィールドマスクそのものの一覧・料金面の判断は `docs/ARCHITECTURE.md`「Text Search の FieldMask 方針」を参照。

## 生成対象フィールドと制約

AI生成対象フィールドと自由記述・固定語彙の分類は `docs/MODEL.md`「自由記述と固定語彙の区別」を参照。ここでは、AI SDK 呼び出しが生成時に満たすべき制約を定義する（`Restaurant` 型自体はこれらを自己強制しない。生成サービスと zod スキーマが担保する）。

- Google 由来のフィールド（`placeId` / `address` / `location` / `phone` / `photoUrl` / `genre`）は、値が確認できない場合 `null` のままにし、AI や UI 側で埋め合わせない（`docs/RELIABILITY.md`）。これらは Places API 施設検索（Text Search）のレスポンスから直接取得し、店舗ごとにレスポンスに含まれていた値だけを埋める。
- AI 生成フィールド（`matchTier` を除く `Restaurant` 型の残りのフィールド）は、候補探索で得た店舗情報とヒアリング条件をもとに1回の生成でまとめて埋める。`evidence` / `confidence` を持たせ、`docs/RELIABILITY.md` の根拠カテゴリ・不確実性の明示方針に対応させる。zod スキーマ（`app/domain/models/restaurant-evaluation-schema.ts`）として定義し、`generateObject` の出力スキーマとそのまま対応させる。`room` / `quiet` / `prestige` / `service` / `evidence` / `confidence` は zod の `z.enum([...])` で同じ語彙を強制し、AI がこの型に無い値を生成しないようにしている。`matchTier` は AI 生成フィールドではなく、それらの生成結果を使ってアプリ側で決定的に算出する（`docs/MODEL.md`「マッチ度（MatchTier）の算出方法」）。`genre` も AI 生成ではなく Places API の `primaryType`/`types` から `mapPlaceTypesToGenre` が決定的に変換するため、この zod スキーマには含まれない。
- 未生成・生成失敗時は AI 生成フィールドと `matchTier` を `null` のままにし、Google 由来のフィールドだけで一覧・MAP表示が成立するようにする（`docs/RELIABILITY.md` の段階的表示）。
- `evidence` / `confidence` を伴わない AI 評価文言を生成しない（`docs/RELIABILITY.md` の根拠付け方針）。

## プロンプト構築とセキュリティ

`docs/SECURITY.md` のプロンプトインジェクション対策を、AI SDK 実装では次のように具体化する。

- 店舗説明、口コミ、ユーザー自由入力は常に「データ」として扱い、system prompt やツール定義とは明確に分離する。
- プロンプトには生の長文をそのまま渡さず、`app/server/services/` で抽出・要約済みの根拠フィールドを渡す。
- ユーザー自由入力・店舗説明・口コミには長さ上限を設ける。上限は `app/server/services/` の入力検証で担保し、AI SDK 呼び出し側で無制限の文字列を受け付けない。
- 生成結果に含める引用テキストは短く制限し、隠しプロンプトや内部スコアリング式を出力させない。
- レート制限は route module の loader/action 側、または `app/server/clients/` のラッパーで行う。Places API の施設検索も同様に、1検索あたりの呼び出し回数の上限で課金・レートを抑える。

## エラーハンドリングとフォールバック

`docs/RELIABILITY.md` の想定される失敗に対応するため、AI SDK 呼び出しは次を満たす。

- 検索結果を表示している場面では、他のAI呼び出し（オンデマンド型の質問応答など）がタイムアウト・失敗しても、比較・ナビゲーションは動作し続ける。
- 施設検索または構造化評価の呼び出しが失敗・タイムアウトした場合は、検索結果画面自体にエラー状態を明示する（`docs/RELIABILITY.md`）。空のカードや架空の店舗で埋めない。
- AI 呼び出しの失敗は例外を握りつぶさず、呼び出し元（`services`）で「AI データなし」の状態として扱い、UI 側に不確実性として伝える。
- 不確実性を自信のある言葉で埋め合わせない。生成に失敗した場合、根拠のない代替文言を生成しない。
- Places API の施設検索が失敗する、または該当0件の場合も、比較・ナビゲーションなど他の操作は使える状態を保ち、0件・取得失敗であることを明示する。
