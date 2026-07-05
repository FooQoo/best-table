import type { Confidence, EvidenceCategory } from "~/domain/models/restaurant";

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
