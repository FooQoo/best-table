# モデル

このドキュメントは、Best Table を DDD（ドメイン駆動設計）の考え方で整理したモデル定義です。`docs/DESIGN.md` の仕様と `docs/ARCHITECTURE.md` のコード配置を前提に、ユビキタス言語、境界づけられたコンテキスト、各コンテキストのエンティティ・値オブジェクト・集約・不変条件・定数（固定語彙）を定義します。

このプロトタイプは単一の Jotai state（`app/state/booking-context.tsx` の `BookingState`）でまとめて状態管理していますが、モデルとしての責務境界は以下のコンテキスト単位で考えます。実装を今すぐこの境界どおりに分割することを要求するものではなく、今後 `app/domain/models/` にモデルを追加する際の設計基盤として使います。

## ユビキタス言語

| 用語 | 意味 |
| --- | --- |
| 会食 | 接待・商談・懇親などを目的とした食事の場。プロダクトが支援する意思決定の単位。 |
| ヒアリング | 会食の文脈（相手・重視条件・予算など）を最小限の入力で取得する行為。 |
| 相手種別（Counterpart） | 会食相手の属性区分。緊張度や失敗できないポイントを表す。 |
| 重視条件（Priority） | ヒアリングで選ぶ、外したくない条件。最大3つ。 |
| 接待安全度（Score） | AI が算出する、その店が今回の会食に適しているかの評価値（0–100）。 |
| 懸念（Concern） | 予約前に把握しておくべきリスク・注意点。根拠カテゴリを伴う。 |
| 根拠カテゴリ（Evidence） | AI 評価や懸念の裏付けとなる情報源の種類（口コミ、写真、席、メニュー、アクセス、説明文）。 |
| 確信度（Confidence） | AI 生成内容の確からしさの区分（high/medium/low）。 |
| 比較候補 | 比較画面で並べて検討する店舗の集合。最大5件。 |
| 最終候補 | 比較の結果、ユーザーが選んだ1店舗。トグルで選択・解除できる。 |
| 予約導線受け渡し | 最終候補を外部予約または予約前確認へ引き継ぐ操作。 |

## 境界づけられたコンテキスト

```
┌─────────────────────┐     ┌───────────────────────────┐     ┌──────────────────┐     ┌────────────────────────┐
│ ヒアリング/検索条件   │ ──> │ 店舗探索・評価              │ ──> │ 比較               │ ──> │ 予約導線受け渡し          │
│ (Hearing)            │     │ (Restaurant Discovery)     │     │ (Comparison)      │     │ (Reservation Handoff)  │
│                      │     │                            │     │                   │     │                        │
│ BookingRequest 集約   │     │ Restaurant (Read Model)    │     │ ComparisonSelection│     │ HandoffRequest         │
└─────────────────────┘     └───────────────────────────┘     └──────────────────┘     └────────────────────────┘
```

コンテキスト間の関係:

- ヒアリング/検索条件 → 店舗探索・評価: `BookingRequest` の内容（エリア座標・日時・人数・予算・重視条件・会食文脈）が `Restaurant[]` 生成の入力になる（上流・下流の関係。ヒアリング側の型を変えると評価生成の入力契約が変わる）。
- 店舗探索・評価 → 比較: `ComparisonSelection` は `Restaurant.id` の集合を参照するだけで、店舗データ自体は複製しない。
- 比較 → 予約導線受け渡し: `finalStoreId` が確定した時点で、`HandoffRequest` が `Restaurant` と `BookingRequest` の要約を参照する。

## コンテキスト1: ヒアリング/検索条件（Hearing）

### 集約: `BookingRequest`（集約ルート）

会食の検索条件と文脈をひとまとめにした集約。現行実装では `BookingState`（`app/state/booking-context.tsx`）としてこの集約全体を1つの Jotai atom に保持している。

構成する値オブジェクト:

- `SearchCondition`（検索基本条件）: `selectedAreas: AreaCity[]`, `date`, `time`, `people`
- `DiningContext`（会食文脈）: `counterpart: CounterpartId | null`, `counterpartOtherText`
- `Budget`（予算）: `budgetMin: BudgetLabel`, `budgetMax: BudgetLabel`, `budgetOtherOn`, `budgetOtherText`
- `Priorities`（重視条件）: `priorities: PriorityKey[]`（最大3）, `priorityOtherOn`, `priorityOtherText`

不変条件:

- `priorities` は最大3件まで。
- `selectedAreas` は `AREA_REGIONS` に存在する `AreaCity` のみを許可する。
- `budgetMin` / `budgetMax` は `BUDGET_STEPS` の固定語彙、または自由入力トグルが有効な場合のみ自由文字列を許容する。

### 値オブジェクト定義

```ts
type CounterpartId = string; // COUNTERPARTS の id と対応する固定語彙（"exec" | "partner" | "boss" | "thanks" | "bond" | "other"）
type PriorityKey = string;   // PRIORITIES の key と対応する固定語彙（"calm" | "room" | "prestige" | "service" | "access" | "budget" | "other"）
type AreaCity = string;      // AREA_REGIONS から導出される市区名の固定語彙（例: "銀座", "六本木"）
type BudgetLabel = string;   // BUDGET_STEPS の固定語彙（"指定なし" | "¥5,000" | ... | "¥50,000"）
```

いずれも列挙値は `app/constants/`（`docs/ARCHITECTURE.md` の移設方針により、現行 `app/mocks/data.ts` から移設予定）が唯一の情報源（single source of truth）であり、`app/domain/models/` 側で値を再定義しない。

### ドメインサービス

- `AreaGeocodingService`（概念）: `AreaCity` を Gemini グラウンディングに渡す緯度経度に変換する。固定のエリア→緯度経度対応表を使う（`docs/ARCHITECTURE.md`）。

## コンテキスト2: 店舗探索・評価（Restaurant Discovery）

### `Restaurant`: 識別子を持つ Read Model（集約ではなく DTO に近い）

`Restaurant` は識別子（`id`）を持つため型としてはエンティティだが、DDD でいう「振る舞いによって自身の不変条件を守る集約ルート」ではない。生成（Gemini グラウンディング＋構造化評価）というサービス層の処理結果を1回で丸ごと詰め替えただけの読み取り専用データであり、アプリ内でこれを変更するドメインコマンドは存在しない（`score` や `concern` を書き換えるユースケースが無い）。したがって性質としては **DTO / Read Model** に近い。

それでも型として独立させる理由:

- `ComparisonSelection.compareIds` / `finalStoreId` から `id` で参照される、集約間参照の単位になる。
- `RestaurantRepository` がキャッシュ・取得する単位であり、部分更新ではなく常に丸ごと1レコードとして扱われる。
- 生データ（Google 由来）と AI 派生評価を型として分離しない、という明示的な設計判断がある（後述）。

生データと AI 派生評価を型として分離しない理由: 店舗候補は Google マップによるグラウンディングと AI 評価をまとめて一度に生成するだけであり、生成過程が単一のため、型を分ける意味がない。検索結果一覧、MAP、比較表、最終候補パネルはすべてこの型を参照し、画面ごとに別の形へ作り替えない。

```ts
import { AREA_REGIONS, BUDGET_STEPS } from "~/constants/area"; // 実装順序: 先に app/mocks/data.ts から移設しておく

type EvidenceCategory =
  | "review"
  | "photo"
  | "seat"
  | "menu"
  | "access"
  | "description";

// ヒアリングの選択肢と同じ固定語彙。既存の定数から導出し、値を二重管理しない。
type AreaCity = (typeof AREA_REGIONS)[number]["prefectures"][number]["cities"][number];
type BudgetLabel = (typeof BUDGET_STEPS)[number];

// 評価軸の表示ラベル。3段階の固定語彙。
type RatingSymbol = "◎" | "○" | "△";

// 個室・席の状況。固定語彙にし、AI に自由記述させない。
type RoomAvailability =
  | "個室あり"
  | "半個室あり"
  | "カウンターのみ"
  | "個室なし"
  | "情報なし";

type Restaurant = {
  // Google 由来（グラウンディング出力と、そこに含まれる写真参照の解決）。確認できない値は null のまま。
  id: string; // アプリ内部の一意ID。自由文字列
  placeId: string | null; // グラウンディングメタデータ由来。Google発行の不透明な文字列
  name: string; // 店舗名。固有名詞のため自由文字列
  genre: string | null; // 料理ジャンル。実在ジャンルは種類が多く固定語彙化しないため自由文字列。Google側の分類をそのまま断定せず、不明なら null
  area: AreaCity; // ヒアリングの選択肢と同じ固定語彙
  address: string | null; // 住所。自由文字列
  location: { lat: number; lng: number } | null; // MAP表示に使う実座標
  phone: string | null; // 連絡先。自由文字列
  photoUrl: string | null; // 代表写真。グラウンディング出力にある情報だけから解決した実URL

  // AI 生成部分。ヒアリング条件を踏まえた1回の生成でまとめて埋める。生成前・失敗時は null。
  score: number | null; // 接待安全度 0-100
  room: RoomAvailability | null; // 個室・席の状況（個室有無の表示も兼ねる）。固定語彙
  quiet: RatingSymbol | null; // 固定語彙
  prestige: RatingSymbol | null;
  service: RatingSymbol | null;
  access: string | null; // 最寄り駅・徒歩分数などの説明（例: "銀座駅 徒歩3分"）。駅名・所要時間の組み合わせは無数にあるため自由文字列
  budgetLabel: Exclude<BudgetLabel, "指定なし"> | null; // 予算の目安。BUDGET_STEPS と同じ固定語彙から最も近いものを選ばせる。「指定なし」は AI 出力としては使わず、不明は null
  concern: { text: string; evidence: EvidenceCategory[] } | null; // text は自由文字列。懸念なしは null（「特になし」を無根拠に断定しない）
  matchingSummary: string | null; // AIによるマッチングポイント要約。自由文字列
  evidence: EvidenceCategory[]; // 生成全体で参照した根拠カテゴリ。固定語彙
  confidence: "high" | "medium" | "low" | null; // 固定語彙
  generatedAt: string | null; // ISO日時
};
```

自由記述と固定語彙の区別:

- **自由記述のまま**にするフィールド: `id` / `placeId` / `name` / `genre` / `address` / `phone` / `photoUrl` / `access` / `concern.text` / `matchingSummary` / `generatedAt`。実世界の値の種類が多い、または固有名詞・URL・タイムスタンプなど値そのものに意味があるため、決め打ちの語彙で表現できない。
- **固定語彙として型定義**するフィールド: `area`（`AreaCity`）、`budgetLabel`（`BudgetLabel`）、`room`（`RoomAvailability`）、`quiet` / `prestige` / `service`（`RatingSymbol`）、`evidence`（`EvidenceCategory`）、`confidence`。いずれもアプリ側で選択肢が決まっている、または3〜6段階程度の小さな語彙に正規化できる。
  - `area` / `budgetLabel` は、ヒアリング画面が使う `AREA_REGIONS` / `BUDGET_STEPS`（`app/constants/` に移設後のもの）から型を導出し、値を二重管理しない。
  - `room` / `quiet` / `prestige` / `service` / `evidence` / `confidence` は、`generateObject` の zod スキーマ側で `z.enum([...])` として同じ語彙を強制し、AI がこの型に無い値を生成しないようにする。

生成時に満たすべき制約（`Restaurant` 型自体は自己強制しない。生成サービスと zod スキーマが担保する）:

- Google 由来のフィールド（`placeId` / `genre` / `address` / `location` / `phone` / `photoUrl`）は、値が確認できない場合 `null` のままにし、AI や UI 側で埋め合わせない（`docs/RELIABILITY.md`）。`genre` は Google 側の分類とプロダクトの表示用ジャンル（会席・日本料理、鮨など）が一致しない場合があるため、厳密に確認できない場合は「ジャンル不明」のように表示する。
- AI 生成フィールド（`score` 以下）は、候補探索で得た店舗情報とヒアリング条件をもとに1回の生成でまとめて埋める。`evidence` / `confidence` を持たせ、`docs/RELIABILITY.md` の根拠カテゴリ・不確実性の明示方針に対応させる。zod スキーマとして定義し、`generateObject` の出力スキーマとそのまま対応させる。
- 未生成・生成失敗時は AI 生成フィールドを `null` のままにし、Google 由来のフィールドだけで一覧・MAP表示が成立するようにする（`docs/RELIABILITY.md` の段階的表示）。
- `budgetLabel` は `BudgetLabel` から `"指定なし"` を除いた語彙のみを取る（AI 出力としては使わない）。
- `evidence` / `confidence` を伴わない AI 評価文言を生成しない（`docs/RELIABILITY.md` の根拠付け方針）。

### ドメインサービス

- `RestaurantDiscoveryService`（概念、実装は `app/server/services/`）: `BookingRequest` から Gemini グラウンディング呼び出しと構造化評価呼び出しを直列に実行し、`Restaurant[]` を生成する。
- `RestaurantPhotoResolutionService`（概念、実装は `app/server/clients/google-places.ts`）: グラウンディングメタデータの写真参照を実画像 URI に解決する。

### リポジトリ

- `RestaurantRepository`（実装は `app/server/repositories/`）: 正規化したヒアリング条件（エリア座標・日時・人数・予算・重視条件・相手種別）をキーに、生成済み `Restaurant[]` をキャッシュ・取得する。外部 API は呼ばない。

## コンテキスト3: 比較（Comparison）

### 集約: `ComparisonSelection`（集約ルート）

```ts
type ComparisonSelection = {
  compareIds: string[];   // Restaurant.id の参照。最大5件
  finalStoreId: string | null; // Restaurant.id の参照。トグルで選択・解除
};
```

不変条件:

- `compareIds` は最大5件まで（超過分は追加不可）。
- 通常の比較フロー（比較表の表示）は `compareIds.length >= 2` を必要とする。
- `finalStoreId` の選択はトグル可能（同じ ID を再度指定すると解除）。
- `finalStoreId` は `compareIds` に含まれる `Restaurant.id` を参照する想定（比較外の店舗を最終候補にはしない）。

`ComparisonSelection` は `Restaurant` を複製せず ID 参照のみを持つ。表示時は `RestaurantRepository`（またはキャッシュ済み検索結果）から実体を解決する。

## コンテキスト4: 予約導線受け渡し（Reservation Handoff）

### 集約: `HandoffRequest`（集約ルート、プロトタイプでは未実装）

```ts
type HandoffRequest = {
  restaurantId: string;     // ComparisonSelection.finalStoreId を引き継ぐ
  bookingSummary: {
    selectedAreas: string[];
    date: string;
    time: string;
    people: number;
    counterpart: string | null;
    budgetMin: string;
    budgetMax: string;
  };
};
```

不変条件:

- `restaurantId` は `finalStoreId` が確定している場合のみ生成できる（未選択の状態では受け渡し画面へ遷移しない）。
- 空席・予約成立を断定しない（`docs/RELIABILITY.md` / `docs/SECURITY.md` のガードレール）。実予約 API を呼ばず、外部予約導線または予約前確認への受け渡しに留める（`docs/DESIGN.md` の実装対象外）。

## 定数・固定語彙 一覧

DDD 上、以下はすべて「値オブジェクトが取りうる固定語彙（列挙）」であり、値の二重管理を避けるため定義元を一箇所に定める。

| 定数 | 定義元（移設後） | 対応する値オブジェクト | 備考 |
| --- | --- | --- | --- |
| `AREA_REGIONS` | `app/constants/area.ts` | `AreaCity` | 地方 > 都道府県 > 市区の階層データ |
| `BUDGET_STEPS` | `app/constants/area.ts` | `BudgetLabel` | `"指定なし"` を含む。AI 生成の `budgetLabel` はこれを除いた語彙 |
| `COUNTERPARTS` | `app/constants/` | `CounterpartId` | 相手種別ごとの `label` / `desc` を保持 |
| `PRIORITIES` | `app/constants/` | `PriorityKey` | 重視条件ごとの `label` / `desc` を保持 |
| `RoomAvailability` の語彙 | `app/domain/models/restaurant.ts` | `RoomAvailability` | `generateObject` の zod スキーマで `z.enum` として強制 |
| `RatingSymbol` の語彙 | `app/domain/models/restaurant.ts` | `RatingSymbol` | 同上 |
| `EvidenceCategory` の語彙 | `app/domain/models/restaurant.ts` | `EvidenceCategory` | 同上 |
| `Confidence` の語彙 | `app/domain/models/restaurant.ts` | `Confidence` | 同上 |
| 比較候補の上限（5件） | `app/domain/models/`（定数として明示、例: `MAX_COMPARE_COUNT = 5`） | `ComparisonSelection.compareIds` | `docs/DESIGN.md` の制約と一致させる |
| 重視条件の上限（3件） | `app/domain/models/`（例: `MAX_PRIORITY_COUNT = 3`） | `Priorities.priorities` | 同上 |
| 比較表示に必要な最小件数（2件） | `app/domain/models/`（例: `MIN_COMPARE_COUNT = 2`） | `ComparisonSelection.compareIds` | 同上 |

`app/domain/models/` に集約の型を実装する際は、マジックナンバー（3件・5件・2件）をこの表のとおり名前付き定数として定義し、`app/state/booking-context.tsx` の `togglePriority` / `toggleCompare` の判定処理から参照する（現行実装のようにリテラル値を関数内に埋め込まない）。

## 現行実装との対応

- `BookingState`（`app/state/booking-context.tsx`）は、本ドキュメントの `BookingRequest` + `ComparisonSelection` の2集約を1つの atom にまとめたものに相当する。将来 `app/domain/models/` に型を切り出す際は、この2集約の境界を型定義上も分離することを検討する（ただし Jotai atom 自体を分割するかは実装判断であり本ドキュメントの必須事項ではない）。
- `Store`（`app/mocks/data.ts`）は `Restaurant`（Read Model）のプロトタイプ版であり、`docs/ARCHITECTURE.md` の移行方針（`pos` → `location`、`photo` → `photoUrl` など）に従って置き換える。
- `HandoffRequest` は現時点でコード上の対応物がなく、`/reservation-handoff` ルート実装時に `app/domain/models/` へ追加する。
