export type EmphasisKey = "room" | "quiet" | "prestige" | "service" | "access";

export const EMPHASIS_LABELS: Record<EmphasisKey, string> = {
  room: "個室",
  quiet: "静かさ",
  prestige: "格式",
  service: "接客",
  access: "アクセス",
};

// COUNTERPARTS は5種類あるが、docs/PLANS.md の受け入れ条件は exec/partner/boss の3パターンのみを
// 定義している。thanks/bond は暫定で partner 相当の重み（会話しやすさ・アクセス）を流用する。
// boss の「予算」重視は Store 型に予算フィールドが無く強調表示できないため、
// 落ち着き（quiet）・使いやすさ（access）のみを強調する（UoW-6 のデータモデル再構成で解消予定）。
const EMPHASIS_BY_COUNTERPART: Record<string, EmphasisKey[]> = {
  exec: ["room", "prestige", "service"],
  partner: ["quiet", "access"],
  boss: ["quiet", "access"],
  thanks: ["quiet", "access"],
  bond: ["quiet", "access"],
};

export function getEmphasisKeys(counterpartId: string | null): EmphasisKey[] {
  if (!counterpartId) return [];
  return EMPHASIS_BY_COUNTERPART[counterpartId] ?? [];
}
