import type {
  Confidence,
  EvidenceCategory,
  Genre,
  MatchTier,
} from "~/domain/models/restaurant";

export const EVIDENCE_LABELS: Record<EvidenceCategory, string> = {
  review: "口コミ",
  photo: "写真",
  seat: "席",
  menu: "メニュー",
  access: "アクセス",
  description: "店舗紹介文",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  highest: "最高",
  high: "高",
  medium: "中",
  low: "低",
};

export const GENRE_LABELS: Record<Genre, string> = {
  japanese: "和食",
  sushi: "鮨",
  yakiniku: "焼肉・焼鳥",
  noodles: "麺類",
  chinese: "中華",
  western: "洋食",
  bar: "バー・居酒屋",
  cafe: "カフェ",
  bakery: "ベーカリー",
  other: "その他",
};
