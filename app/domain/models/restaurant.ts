// ドメインモデル定義: docs/MODEL.md の「コンテキスト2: 店舗探索・評価」を実装したもの。
// フィールドの意味・null の扱い・固定語彙かどうかの区別は docs/MODEL.md を正とする。

export type EvidenceCategory =
  | "review"
  | "photo"
  | "seat"
  | "menu"
  | "access"
  | "description";

export type RatingSymbol = "◎" | "○" | "△";

export type RoomAvailability =
  | "個室あり"
  | "半個室あり"
  | "カウンターのみ"
  | "個室なし"
  | "情報なし";

export type Confidence = "high" | "medium" | "low";

// 相手種別・重視条件・予算と AI 評価済みフィールドを照合して決定的に算出する
// マッチ度。AI には生成させない（app/utils/scoring.ts の computeMatchTier を正とする）。
export type MatchTier = "highest" | "high" | "medium" | "low";

export const MATCH_TIERS: readonly MatchTier[] = ["highest", "high", "medium", "low"];

// 地図ピン・一覧表示で使うジャンルの固定語彙。
// AI 評価がここに無いジャンルだと判断した場合は "other" にし、自由文を作らせない。
export type Genre =
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

export type ConcernItem = {
  text: string;
  evidence: EvidenceCategory[];
};

// docs/MODEL.md「コンテキスト2」: 一休掲載店マスタとの店舗同定（照合）に使ったキー種別。
export type IkyuMatchKey = "placeId" | "phone" | "name-address";

export const IKYU_MATCH_KEYS: readonly IkyuMatchKey[] = [
  "placeId",
  "phone",
  "name-address",
];

// 一休.comレストランへの送客リンク。URL は一休掲載店マスタ由来の値のみを使い、
// AI・自由入力・文字列組み立てで生成しない（docs/SECURITY.md）。
export type IkyuReferral = {
  url: string;
  matchedBy: IkyuMatchKey;
};

// docs/MODEL.md: 店舗候補は Google マップによるグラウンディングと AI 評価をまとめて
// 一度に生成するため、生データと AI 派生評価を型として分離しない。
export type Restaurant = {
  // Google 由来。確認できない値は null のまま。
  id: string;
  placeId: string | null;
  name: string;
  area: string;
  address: string | null;
  location: { lat: number; lng: number } | null;
  phone: string | null;
  photoUrl: string | null;

  // 一休掲載店マスタ由来。施設検索直後の店舗同定（照合）で一致した場合だけ埋める。
  // 照合できない店舗・マスタ読込失敗時は null のまま表示を続ける（除外しない）。
  ikyu: IkyuReferral | null;

  // AI 生成部分。未生成・生成失敗時は null。
  genre: Genre | null;
  matchTier: MatchTier | null;
  room: RoomAvailability | null;
  quiet: RatingSymbol | null;
  prestige: RatingSymbol | null;
  service: RatingSymbol | null;
  access: string | null;
  budgetLabel: string | null;
  concerns: ConcernItem[];
  matchingSummary: string | null;
  evidence: EvidenceCategory[];
  confidence: Confidence | null;
  generatedAt: string | null;
};

// docs/MODEL.md「定数・固定語彙 一覧」: マジックナンバーを名前付き定数として定義する。
export const MAX_COMPARE_COUNT = 5;
export const MIN_COMPARE_COUNT = 2;
export const MAX_PRIORITY_COUNT = 3;

const EVIDENCE_CATEGORIES: readonly EvidenceCategory[] = [
  "review",
  "photo",
  "seat",
  "menu",
  "access",
  "description",
];

const CONFIDENCE_LEVELS: readonly Confidence[] = ["high", "medium", "low"];

export const GENRES: readonly Genre[] = [
  "japanese",
  "sushi",
  "yakiniku",
  "noodles",
  "chinese",
  "western",
  "bar",
  "cafe",
  "bakery",
  "other",
];

function isEvidenceCategory(value: unknown): value is EvidenceCategory {
  return (
    typeof value === "string" &&
    (EVIDENCE_CATEGORIES as readonly string[]).includes(value)
  );
}

// 未生成データ（AI 生成フィールドが null）でも一覧・詳細表示が成立することを前提にした
// 最小限の形状チェック。Google 由来フィールドの欠落は許容し、固定語彙のみ厳密に検証する。
export function isRestaurant(value: unknown): value is Restaurant {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;

  if (typeof r.id !== "string" || r.id.length === 0) return false;
  if (typeof r.name !== "string" || r.name.length === 0) return false;
  if (typeof r.area !== "string") return false;

  if (!Array.isArray(r.concerns)) return false;
  for (const concern of r.concerns) {
    if (typeof concern !== "object" || concern === null) return false;
    const c = concern as Record<string, unknown>;
    if (typeof c.text !== "string") return false;
    if (!Array.isArray(c.evidence) || !c.evidence.every(isEvidenceCategory)) {
      return false;
    }
  }

  if (!Array.isArray(r.evidence) || !r.evidence.every(isEvidenceCategory)) {
    return false;
  }

  if (
    r.confidence !== null &&
    !(CONFIDENCE_LEVELS as readonly string[]).includes(r.confidence as string)
  ) {
    return false;
  }

  if (r.genre !== null && !(GENRES as readonly string[]).includes(r.genre as string)) {
    return false;
  }

  if (
    r.matchTier !== null &&
    !(MATCH_TIERS as readonly string[]).includes(r.matchTier as string)
  ) {
    return false;
  }

  if (r.generatedAt !== null && Number.isNaN(Date.parse(r.generatedAt as string))) {
    return false;
  }

  // ikyu は必須フィールド（照合できない場合は null）。欠落は不正な形状として扱う。
  if (!("ikyu" in r)) return false;
  if (r.ikyu !== null) {
    if (typeof r.ikyu !== "object") return false;
    const ikyu = r.ikyu as Record<string, unknown>;
    if (typeof ikyu.url !== "string" || ikyu.url.length === 0) return false;
    if (!(IKYU_MATCH_KEYS as readonly string[]).includes(ikyu.matchedBy as string)) {
      return false;
    }
  }

  return true;
}
