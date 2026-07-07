# モデル

このドキュメントは、Best Table を DDD（ドメイン駆動設計）の考え方で整理したモデル定義です。`docs/DESIGN.md` の仕様と `docs/ARCHITECTURE.md` のコード配置を前提に、ユビキタス言語、境界づけられたコンテキスト、各コンテキストのエンティティ・値オブジェクト・集約・不変条件・定数（固定語彙）を定義します。

このプロトタイプは `app/state/booking-context.tsx` の `BookingState` で多くの画面状態をまとめて扱ってきましたが、`mvp-cycle-5` では `BookingRequest` 相当の検索・会食条件を URL query state の復元対象にする。モデルとしての責務境界は以下のコンテキスト単位で考えます。実装を今すぐこの境界どおりに分割することを要求するものではなく、今後 `app/domain/models/` にモデルを追加する際の設計基盤として使います。

## ユビキタス言語

| 用語 | 意味 |
| --- | --- |
| 会食 | 接待・商談・懇親などを目的とした食事の場。プロダクトが支援する意思決定の単位。 |
| ヒアリング | 会食の文脈（相手・重視条件・予算など）を最小限の入力で取得する行為。 |
| 相手種別（Counterpart） | 会食相手の属性区分。緊張度や失敗できないポイントを表す。 |
| 重視条件（Priority） | ヒアリングで選ぶ、外したくない条件。最大3つ。 |
| マッチ度（MatchTier） | 相手種別・重視条件・予算と AI 評価済みフィールドを照合し、アプリ側で決定的に算出する4段階（最高・高・中・低）の適合度。AI には生成させない。 |
| 懸念（Concern） | 予約前に把握しておくべきリスク・注意点。根拠カテゴリを伴う。 |
| 根拠カテゴリ（Evidence） | AI 評価や懸念の裏付けとなる情報源の種類（口コミ、写真、席、メニュー、アクセス、説明文）。 |
| 確信度（Confidence） | AI 生成内容の確からしさの区分（high/medium/low）。 |
| 比較候補 | 比較サイドパネルで並べて検討する店舗の集合。最大5件。 |
| 座標解決 | `placeId` などの店舗識別子から、地図表示に使う緯度経度を取得する処理。 |
| 代表写真 | 店舗カードや比較表で表示する1枚の店舗写真。取得できない場合はプレースホルダーに戻す。 |
| 送客（Referral） | 納得した候補を予約手段へ外部リンクで引き継ぐこと。一休.com検索結果ページ、および Google Maps の場所ページへ送客する。プロダクトのゴールであり、アプリ内の確定・決定操作ではない。 |

## 境界づけられたコンテキスト

```
┌─────────────────────┐     ┌───────────────────────────┐     ┌──────────────────┐
│ ヒアリング/検索条件   │ ──> │ 店舗探索・評価              │ ──> │ 比較               │
│ (Hearing)            │     │ (Restaurant Discovery)     │     │ (Comparison)      │
│                      │     │                            │     │                   │
│ BookingRequest 集約   │     │ Restaurant (Read Model)    │     │ ComparisonSelection│
└─────────────────────┘     └───────────────────────────┘     └──────────────────┘
```

コンテキスト間の関係:

- ヒアリング/検索条件 → 店舗探索・評価: `BookingRequest` の内容（エリア座標・日時・人数・予算・重視条件・会食文脈）が `Restaurant[]` 生成の入力になる（上流・下流の関係。ヒアリング側の型を変えると評価生成の入力契約が変わる）。
- 店舗探索・評価 → 比較: `ComparisonSelection` は `Restaurant.id` の集合を参照するだけで、店舗データ自体は複製しない。
- 店舗探索・評価 → 地図コンテキスト AI 相談: `/results` に読み込まれている `Restaurant[]` と `BookingRequest` の要約を参照し、表示中店舗群に対する横断的な質問応答を行う。相談は `Restaurant` を更新せず、比較候補の選択も直接変更しない。

`mvp-cycle-4` で、比較の先にあった「予約導線受け渡し（Reservation Handoff）」というロードマップ上のコンテキストを撤回した。比較は複数店舗を並べて見比べるところまでを責務とし、最終候補の確定や外部予約・予約前確認への引き継ぎという概念は持たない。

`mvp-cycle-6` で、プロダクトのゴールを「納得した候補の予約手段への送客」と定義した。送客は Handoff 集約の復活ではなく、`Restaurant` の値（店舗名・placeId）から都度組み立てる読み取り専用の外部リンク（一休.com検索結果ページ、既存の Google Maps リンク）として表現する。一休掲載店マスタとの照合（店舗同定）は行わず、`Restaurant` にも送客用の追加フィールドを持たせない。送客の状態（どの店へ送客したか）をアプリ側で保持・追跡する集約も持たない。

## コンテキスト1: ヒアリング/検索条件（Hearing）

### 集約: `BookingRequest`（集約ルート）

会食の検索条件と文脈をひとまとめにした集約。`mvp-cycle-5` では、この集約に相当するフィールドを `nuqs` による URL query state として保持し、リロード・直接アクセス・共有リンクから復元できるようにする。Jotai は既存コンポーネントの接続レイヤーと、URL に保存しない一時状態の保持に寄せる。

構成する値オブジェクト:

- `SearchCondition`（検索基本条件）: `selectedAreas: AreaCity[]`, `date`, `time`, `people`
- `DiningContext`（会食文脈）: `counterpart: CounterpartId | null`, `counterpartOtherText`
- `Budget`（予算）: `budgetMin: BudgetLabel`, `budgetMax: BudgetLabel`, `budgetOtherOn`, `budgetOtherText`
- `Priorities`（重視条件）: `priorities: PriorityKey[]`（最大3）, `priorityOtherOn`, `priorityOtherText`

不変条件:

- `priorities` は最大3件まで。
- `selectedAreas` は `AREA_REGIONS` に存在する `AreaCity` のみを許可する。
- `budgetMin` / `budgetMax` は `BUDGET_STEPS` の固定語彙、または自由入力トグルが有効な場合のみ自由文字列を許容する。
- URL query から復元する値は、固定語彙、型、上限に合わせて正規化する。未知の `counterpart` / `priority` / `area`、1未満の `people`、不正な boolean はそのまま検索 API や AI prompt に渡さない。

### 値オブジェクト定義

```ts
type CounterpartId = string; // COUNTERPARTS の id と対応する固定語彙（"exec" | "partner" | "boss" | "thanks" | "bond" | "other"）
type PriorityKey = string;   // PRIORITIES の key と対応する固定語彙（"calm" | "room" | "prestige" | "service" | "access" | "budget" | "other"）
type AreaCity = string;      // AREA_REGIONS から導出される市区名の固定語彙（例: "銀座", "六本木"）
type BudgetLabel = string;   // BUDGET_STEPS の固定語彙（"指定なし" | "¥5,000" | ... | "¥50,000"）
```

いずれも列挙値は `app/mocks/data.ts` が唯一の情報源（single source of truth）であり、`app/domain/models/` 側で値を再定義しない。`app/constants/` への移設は UoW-6 で計画したが未実施のまま（下記「コンテキスト2」「現行実装との対応」を参照）。

### ドメインサービス

- `AreaGeocodingService`（概念、実装は `app/constants/area-coordinates.ts` の `resolveAreaLatLng`）: `AreaCity` を Places API 施設検索（Text Search）に渡す緯度経度に変換する。固定のエリア→緯度経度対応表を使う（`docs/ARCHITECTURE.md`）。

## コンテキスト2: 店舗探索・評価（Restaurant Discovery）

### `Restaurant`: 識別子を持つ Read Model（集約ではなく DTO に近い）

`Restaurant` は識別子（`id`）を持つため型としてはエンティティだが、DDD でいう「振る舞いによって自身の不変条件を守る集約ルート」ではない。生成（Places API 施設検索＋ Gemini 構造化評価＋決定的なマッチ度算出）というサービス層の処理結果を1回で丸ごと詰め替えただけの読み取り専用データであり、アプリ内でこれを変更するドメインコマンドは存在しない（`matchTier` や `concern` を書き換えるユースケースが無い）。したがって性質としては **DTO / Read Model** に近い。

それでも型として独立させる理由:

- `ComparisonSelection.compareIds` から `id` で参照される、集約間参照の単位になる。
- `RestaurantRepository` がキャッシュ・取得する単位であり、部分更新ではなく常に丸ごと1レコードとして扱われる。
- 生データ（Google 由来）と AI 派生評価を型として分離しない、という明示的な設計判断がある（後述）。

生データと AI 派生評価を型として分離しない理由: 店舗候補は Places API による施設検索と AI 評価をまとめて一度に生成するだけであり、生成過程が単一のため、型を分ける意味がない。検索結果一覧、MAP、比較表はすべてこの型を参照し、画面ごとに別の形へ作り替えない。

```ts
// app/domain/models/restaurant.ts（実装済み）
type EvidenceCategory =
  | "review"
  | "photo"
  | "seat"
  | "menu"
  | "access"
  | "description";

// 評価軸の表示ラベル。3段階の固定語彙。
type RatingSymbol = "◎" | "○" | "△";

// 相手種別・重視条件・予算と AI 評価済みフィールドを照合して決定的に算出する
// マッチ度。AI には生成させない（app/utils/scoring.ts の computeMatchTier）。
type MatchTier = "highest" | "high" | "medium" | "low";

// 個室・席の状況。固定語彙にし、AI に自由記述させない。
type RoomAvailability =
  | "個室あり"
  | "半個室あり"
  | "カウンターのみ"
  | "個室なし"
  | "情報なし";

// 地図ピン・一覧表示で使うジャンルの固定語彙。10種 + "other"。
type Genre =
  | "japanese"
  | "sushi"
  | "yakiniku"
  | "noodles"
  | "chinese"
  | "western"
  | "bar"
  | "cafe"
  | "bakery"
  | "other";

type ConcernItem = { text: string; evidence: EvidenceCategory[] };

type Restaurant = {
  // Google 由来（Places API 施設検索のレスポンスから直接取得）。確認できない値は null のまま。
  id: string; // アプリ内部の一意ID。placeId から "/" を "_" に置換して作る（URL に使うため。詳細は docs/ARCHITECTURE.md）
  placeId: string | null; // 施設検索の `id` を "places/{id}" 形式に正規化したもの。Google発行の不透明な文字列
  name: string; // 店舗名。固有名詞のため自由文字列
  area: string; // ヒアリングで選んだエリア名をそのまま使う自由文字列
  address: string | null; // 住所。施設検索の `formattedAddress`。含まれなければ null
  location: { lat: number; lng: number } | null; // MAP表示に使う実座標。施設検索の `location`。含まれなければ null
  phone: string | null; // 連絡先。施設検索の `nationalPhoneNumber`。含まれなければ null
  photoUrl: string | null; // 代表写真。施設検索の `photos` から得た photo resource name をプロキシ経由の URL に変換。含まれなければ null
  genre: Genre | null; // 料理ジャンル。施設検索の `primaryType`/`types` から決定的に変換する（`app/server/clients/google-places.ts` の `mapPlaceTypesToGenre`）。対応する type が無い場合は "other"、type 自体が含まれない場合は null。AI 生成ではない

  // AI 生成部分。ヒアリング条件を踏まえた1回の生成でまとめて埋める。生成前・失敗時は null。
  matchTier: MatchTier | null; // マッチ度。AI 評価フィールドとヒアリング条件から決定的に算出する（下記参照）。判定できるフィールドが1つも無い場合は null
  room: RoomAvailability | null; // 個室・席の状況（個室有無の表示も兼ねる）。固定語彙
  quiet: RatingSymbol | null; // 固定語彙
  prestige: RatingSymbol | null;
  service: RatingSymbol | null;
  access: string | null; // 最寄り駅・徒歩分数などの説明（例: "銀座駅 徒歩3分"）。駅名・所要時間の組み合わせは無数にあるため自由文字列。現状は AI 生成でも埋まらないことが多い
  budgetLabel: string | null; // 予算の目安（例: "¥30,000" や "¥30,000-¥50,000"）。AI が自由に生成する文字列で、BUDGET_STEPS の語彙には正規化していない
  concerns: ConcernItem[]; // text は自由文字列。懸念は複数あり得るため配列とし、画面上には常時（ホバー非依存で）表示する。懸念なしは空配列（「特になし」を無根拠に断定しない）
  matchingSummary: string | null; // AIによるマッチングポイント要約。自由文字列
  evidence: EvidenceCategory[]; // 生成全体で参照した根拠カテゴリ。固定語彙
  confidence: "high" | "medium" | "low" | null; // 固定語彙
  generatedAt: string | null; // ISO日時
};
```

Places API 施設検索（Text Search）のフィールドマスクは `id` / `displayName` / `formattedAddress` / `location` / `nationalPhoneNumber` / `photos` / `primaryType` / `types` に絞る（`app/server/clients/google-places.ts` の `GOOGLE_PLACES_SEARCH_FIELD_MASK`）。`primaryType` / `types` は `nationalPhoneNumber` と同じ Pro/Enterprise SKU に含まれるため追加課金は無い。`rating` / `userRatingCount` / `priceLevel` / `reviews` / `reviewSummary` など更に上のSKUのフィールドは取得しない。SKUティアに加えて、`rating`/`reviews`/`reviewSummary` はAI評価プロンプトへの入力として使う用途だとGoogle Maps Platform利用規約の帰属表示義務に抵触するおそれがあるため（`docs/ARCHITECTURE.md`「AI評価プロンプトの入力範囲」）。

### マッチ度（MatchTier）の算出方法

`matchTier` は AI に生成させず、`app/utils/scoring.ts` の `computeMatchTier` がアプリ側で決定的に算出する。

1. 対象フィールドを決める: 相手種別から得られる重視フィールド（`getEmphasisKeys`。例: `exec` → `room`/`prestige`/`service`）と、ヒアリングで選んだ重視条件から得られるフィールド（`PRIORITY_TO_EMPHASIS` で対応付け）を統合する。どちらも無い場合は全フィールドにフォールバックする。
2. `access` は自由文字列（駅名・徒歩分数の組み合わせが無数にある）で良否を機械的に判定できないため、対象に選ばれても採点からは常に除外する。
3. 残ったフィールドごとに良好（good）・不良（not-good）・不明（unknown、null や未確認）を判定する: `room` は個室あり/半個室あり/カウンターのみが良好、個室なしが不良、null・情報なしは不明。`quiet`/`prestige`/`service` は ◎/○ が良好、△ が不良、null は不明。`budgetLabel` はヒアリングの予算範囲内なら良好、範囲外なら不良、予算未指定または未パースなら不明。
4. 判定できたフィールド数（unknown を除く）のうち良好な割合で4段階に振り分ける: 全て良好なら `highest`、半分以上なら `high`、1つ以上なら `medium`、0件なら `low`。判定できたフィールドが1つも無ければ（AI評価が未到達、または全て不明）、捏造せず `null` を返す。

この計算はヒアリング条件（相手種別・予算・重視条件）と AI 評価済みフィールドの両方を必要とするため、`app/server/services/restaurant-search.ts` の `buildRestaurant()` がAI評価結果を受け取った時点で算出し、`Restaurant.matchTier` に格納する。

自由記述と固定語彙の区別:

- **自由記述**にするフィールド: `id` / `placeId` / `name` / `area` / `address` / `phone` / `photoUrl` / `access` / `budgetLabel` / `concerns[].text` / `matchingSummary` / `generatedAt`。実世界の値の種類が多い、または固有名詞・URL・タイムスタンプなど値そのものに意味があるため、決め打ちの語彙で表現できない。`area` / `budgetLabel` は当初 `AREA_REGIONS` / `BUDGET_STEPS` から導出する固定語彙型にする計画だったが、実装時にその移設を見送ったため（下記「現行実装との対応」）、素直な `string` にしている。
- **固定語彙として型定義**するフィールド: `genre`（`Genre`）、`room`（`RoomAvailability`）、`quiet` / `prestige` / `service`（`RatingSymbol`）、`evidence`（`EvidenceCategory`）、`confidence`。いずれもアプリ側で選択肢が決まっている、または3〜10段階程度の小さな語彙に正規化できる。
  - `room` / `quiet` / `prestige` / `service` / `evidence` / `confidence` は、`generateObject` の zod スキーマ（`app/domain/models/restaurant-evaluation-schema.ts`）側で `z.enum([...])` として同じ語彙を強制し、AI がこの型に無い値を生成しないようにしている。`genre` は AI 生成ではないため、この zod スキーマには含まれない（Places API の type 語彙から `app/server/clients/google-places.ts` の `mapPlaceTypesToGenre` が決定的に変換する。対応が無い type は `GENRES` の `"other"` にし、AI 同様に存在しないジャンルを捏造しない）。

生成時に満たすべき制約（`Restaurant` 型自体は自己強制しない。生成サービスと zod スキーマが担保する）:

- Google 由来のフィールド（`placeId` / `address` / `location` / `phone` / `photoUrl` / `genre`）は、値が確認できない場合 `null` のままにし、AI や UI 側で埋め合わせない（`docs/RELIABILITY.md`）。これらは Places API 施設検索（Text Search）のレスポンスから直接取得し、店舗ごとにレスポンスに含まれていた値だけを埋める（含まれない場合は捏造せず `null` のまま）。
- AI 生成フィールド（`matchTier` を除く `Restaurant` 型の残りのフィールド）は、候補探索で得た店舗情報とヒアリング条件をもとに1回の生成でまとめて埋める。`evidence` / `confidence` を持たせ、`docs/RELIABILITY.md` の根拠カテゴリ・不確実性の明示方針に対応させる。zod スキーマとして定義し、`generateObject` の出力スキーマとそのまま対応させる。`matchTier` は AI 生成フィールドではなく、それらの生成結果を使ってアプリ側で決定的に算出する（前述「マッチ度の算出方法」）。
- 未生成・生成失敗時は AI 生成フィールドと `matchTier` を `null` のままにし、Google 由来のフィールドだけで一覧・MAP表示が成立するようにする（`docs/RELIABILITY.md` の段階的表示）。
- `evidence` / `confidence` を伴わない AI 評価文言を生成しない（`docs/RELIABILITY.md` の根拠付け方針）。

### ドメインサービス

- `RestaurantDiscoveryService`（概念、実装は `app/server/services/restaurant-search.ts`）: `BookingRequest` から Places API 施設検索呼び出し（`searchPlacesByText`、`app/server/clients/google-places.ts`）と構造化評価呼び出し（`app/server/clients/gemini-evaluation.ts`）を実行し、評価結果と `BookingRequest` から `computeMatchTier`（`app/utils/scoring.ts`）でマッチ度を算出して `Restaurant[]` を生成する。座標・住所・代表写真は施設検索のレスポンスから直接得るため、`placeId` を使って別途解決する専用サービスは存在しない。解決できない値（レスポンスに含まれない）は `null` のままにし、UI はマーカー非表示・写真プレースホルダーにフォールバックする。施設検索は AI 評価を待たずに先に完了させ、`Restaurant[]` の基本形（Google 由来フィールドのみ）を先に返せるようにする（詳細は `docs/ARCHITECTURE.md`）。

### リポジトリ

- `RestaurantRepository`（実装は `app/server/repositories/`）: 正規化したヒアリング条件（エリア座標・日時・人数・予算・重視条件・相手種別）をキーに、生成済み `Restaurant[]` をキャッシュ・取得する。外部 API は呼ばない。

## コンテキスト3: 地図コンテキスト AI 相談（Map Consultation）

### 値オブジェクト: `MapConsultationRequest`

`MapConsultationRequest` は、`/results` に表示されている店舗群に対する質問応答の入力である。単一店舗の詳細ページではなく、表示中店舗群を横断して比較・懸念・次アクションを相談するために使う。

```ts
type MapConsultationRequest = {
  restaurants: Restaurant[]; // 現在 /results に読み込まれている店舗群
  bookingSummary: ResultsChatBookingSummary;
  question: string; // 短い自由入力、FAQ、またはおすすめ質問
};

type ResultsChatBookingSummary = {
  selectedAreas: string[];
  date: string;
  time: string;
  people: number;
  budgetMin: string;
  budgetMax: string;
  budgetOtherOn: boolean;
  budgetOtherText: string;
  priorities: string[];
  priorityOtherOn: boolean;
  priorityOtherText: string;
  counterpart: string | null;
  counterpartOtherText: string;
};
```

不変条件:

- `restaurants` は空配列の場合、AI 相談を送信しない。
- `restaurants` の各要素は `isRestaurant` を満たす。
- `question` は空文字を許可せず、長さ上限を設ける。
- 回答は `restaurants` と `bookingSummary` の範囲に基づき、未取得の口コミ本文、メニュー詳細、現在空席を根拠として扱わない。
- 相談結果は `ComparisonSelection` を直接変更しない。比較追加・比較から外す操作はユーザー操作として残す。

### 値オブジェクト: `SuggestedQuestion`

```ts
type SuggestedQuestion = {
  text: string;
};
```

不変条件:

- 回答後に提示する `SuggestedQuestion` は4件。
- 質問文は表示中店舗群を前提にした比較・懸念・次アクションに寄せる。
- 空席確定、予約成立、未取得情報を断定させる質問は候補にしない。

生成方法: まず Gemini による AI 生成（`gemini-results-chat-suggestions.ts`）を試み、失敗した場合、またはタイムアウト・安全フィルタ後に4件へ満たない場合は `app/utils/results-chat-suggestions.ts` の deterministic 生成（相手種別・重視条件・直前の質問/回答・表示中店舗群から算出）で穴埋めする（`docs/RELIABILITY.md` の応答速度・フォールバック方針）。

## コンテキスト4: 比較（Comparison）

### 集約: `ComparisonSelection`（集約ルート）

```ts
type ComparisonSelection = {
  compareIds: string[];   // Restaurant.id の参照。最大5件
};
```

不変条件:

- `compareIds` は最大5件まで（超過分は追加不可）。
- 通常の比較フロー（比較表の表示）は `compareIds.length >= 2` を必要とする。

`ComparisonSelection` は `Restaurant` を複製せず ID 参照のみを持つ。表示時は `RestaurantRepository`（またはキャッシュ済み検索結果）から実体を解決する。比較は `/results` 内のサイドパネルとして表示され、最終候補の確定や外部への引き継ぎという操作は持たない（`mvp-cycle-4` で撤回。旧「予約導線受け渡し（Reservation Handoff）」コンテキストと `HandoffRequest` 集約はドキュメント・コードのいずれにも存在しない）。

`ComparisonSelection` は URL query state の共有対象にしない。共有リンクで復元するのは `BookingRequest` 相当の検索条件までで、比較候補は `/results` の画面内でユーザーが選ぶ一時状態として扱う。

## 定数・固定語彙 一覧

DDD 上、以下はすべて「値オブジェクトが取りうる固定語彙（列挙）」であり、値の二重管理を避けるため定義元を一箇所に定める。

| 定数 | 定義元（実際の場所） | 対応する値オブジェクト | 備考 |
| --- | --- | --- | --- |
| `AREA_REGIONS` | `app/mocks/data.ts`（`app/constants/` への移設は未実施） | `AreaCity`（概念上の型。`Restaurant.area` は実装上ただの `string`） | 地方 > 都道府県 > 市区の階層データ |
| `BUDGET_STEPS` | `app/mocks/data.ts`（同上） | `BudgetLabel`（概念上の型。`Restaurant.budgetLabel` は実装上ただの `string \| null`） | `"指定なし"` を含む |
| `COUNTERPARTS` | `app/mocks/data.ts` | `CounterpartId` | 相手種別ごとの `label` / `desc` を保持 |
| `PRIORITIES` | `app/mocks/data.ts` | `PriorityKey` | 重視条件ごとの `label` / `desc` を保持 |
| `GENRES` | `app/domain/models/restaurant.ts` | `Genre` | 10種 + `"other"`。`generateObject` の zod スキーマ（`restaurant-evaluation-schema.ts`）で `z.enum` として強制 |
| `RoomAvailability` の語彙 | `app/domain/models/restaurant.ts` | `RoomAvailability` | `generateObject` の zod スキーマ（`restaurant-evaluation-schema.ts`）で `z.enum` として強制 |
| `RatingSymbol` の語彙 | `app/domain/models/restaurant.ts` | `RatingSymbol` | 同上 |
| `EvidenceCategory` の語彙 | `app/domain/models/restaurant.ts` | `EvidenceCategory` | 同上 |
| `Confidence` の語彙 | `app/domain/models/restaurant.ts` | `Confidence` | 同上 |
| 比較候補の上限（5件） | `app/domain/models/restaurant.ts`（`MAX_COMPARE_COUNT = 5`） | `ComparisonSelection.compareIds` | `docs/DESIGN.md` の制約と一致させる |
| 重視条件の上限（3件） | `app/domain/models/restaurant.ts`（`MAX_PRIORITY_COUNT = 3`） | `Priorities.priorities` | 同上 |
| 比較表示に必要な最小件数（2件） | `app/domain/models/restaurant.ts`（`MIN_COMPARE_COUNT = 2`） | `ComparisonSelection.compareIds` | 同上 |

マジックナンバー（3件・5件・2件）は `app/domain/models/restaurant.ts` の名前付き定数として実装済みで、`app/state/booking-query-state.ts` の `togglePriority`（URL query state）と `app/state/booking-context.tsx` の `toggleCompare`（Jotai）の判定処理から参照している（リテラル値を関数内に埋め込んでいない）。

## 現行実装との対応

- `mvp-cycle-5` で `BookingRequest` 相当の検索・会食条件は `BookingQueryState`（`app/state/booking-query-state.ts`）として URL query state に完全移行し、Jotai の `BookingState`（`app/state/booking-context.tsx`）からは削除した。`BookingState` は現在、本ドキュメントの `ComparisonSelection.compareIds` と、UoW-7 で追加された `restaurants: Restaurant[]`（`/results` が取得した実検索結果）だけを持つ、URL に保存しない画面内一時状態専用の atom になっている。将来 `app/domain/models/` に型を切り出す際は、この境界を型定義上も分離することを検討する。
- `Store`（`app/mocks/data.ts`）は `Restaurant & { pos, photoPlaceholderLabel }` というプロトタイプ専用の拡張型として型定義上は残っているが、現在どのコンポーネントからも `pos` / `photoPlaceholderLabel` は読まれておらず、テストのフィクスチャ用途のみになっている（`docs/ARCHITECTURE.md`「店舗データモデル」）。地図表示・住所・代表写真の正は `Restaurant.location` / `address` / `photoUrl` に一本化されており、mock mode でも同じ形の `Restaurant[]` を返す。
- `mvp-cycle-4` で `BookingState.finalStoreId` と対応する操作を削除した。`ComparisonSelection` は `compareIds` のみを持つ。
