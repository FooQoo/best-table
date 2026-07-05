export type EmphasisKey =
  | "room"
  | "quiet"
  | "prestige"
  | "service"
  | "access"
  | "budgetLabel";

export const EMPHASIS_LABELS: Record<EmphasisKey, string> = {
  room: "個室",
  quiet: "静かさ",
  prestige: "格式",
  service: "接客",
  access: "アクセス",
  budgetLabel: "予算",
};

// COUNTERPARTS は5種類あるが、docs/PLANS.md の受け入れ条件は exec/partner/boss の3パターンのみを
// 定義している。thanks/bond は暫定で partner 相当の重み（会話しやすさ・アクセス）を流用する。
// boss の「予算」重視は UoW-6 で Restaurant.budgetLabel を追加したことで解消し、
// docs/PLANS.md「社内上司フローでは、予算、落ち着き、使いやすさが強調される」のとおり
// 予算（budgetLabel）・落ち着き（quiet）・使いやすさ（access）を強調する。
const EMPHASIS_BY_COUNTERPART: Record<string, EmphasisKey[]> = {
  exec: ["room", "prestige", "service"],
  partner: ["quiet", "access"],
  boss: ["budgetLabel", "quiet", "access"],
  thanks: ["quiet", "access"],
  bond: ["quiet", "access"],
};

export function getEmphasisKeys(counterpartId: string | null): EmphasisKey[] {
  if (!counterpartId) return [];
  return EMPHASIS_BY_COUNTERPART[counterpartId] ?? [];
}
