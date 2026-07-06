import { COUNTERPARTS, PRIORITIES } from "~/mocks/data";

// docs/MODEL.md の会食条件（相手・予算・重視条件）を人が読める文字列に変換する共通ロジック。
// app/server/services/restaurant-search-query.ts（グラウンディング用プロンプト）と
// app/server/services/results-chat-prompt.ts（AI相談用プロンプト）の両方が、
// 同じ会食条件を別々の文言に組み立てる際の重複を避けるためにここへ集約する。
export type BookingSummaryLike = {
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

const PRIORITY_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  PRIORITIES.map((p) => [p.key, p.label]),
);
const COUNTERPART_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  COUNTERPARTS.map((c) => [c.id, c.label]),
);

export function getPriorityLabel(key: string): string {
  return PRIORITY_LABEL_BY_KEY[key] ?? key;
}

export function getCounterpartLabel(id: string): string | null {
  return COUNTERPART_LABEL_BY_ID[id] ?? null;
}

export function describeBudget(summary: BookingSummaryLike): string | null {
  if (summary.budgetOtherOn && summary.budgetOtherText.trim()) {
    return summary.budgetOtherText.trim();
  }
  if (summary.budgetMin !== "指定なし" || summary.budgetMax !== "指定なし") {
    return `${summary.budgetMin}〜${summary.budgetMax}`;
  }
  return null;
}

export function describeCounterpart(summary: BookingSummaryLike): string | null {
  if (summary.counterpart === "other" && summary.counterpartOtherText.trim()) {
    return summary.counterpartOtherText.trim();
  }
  if (summary.counterpart) {
    return getCounterpartLabel(summary.counterpart);
  }
  return null;
}

export function describePriorities(summary: BookingSummaryLike): string[] {
  const labels = summary.priorities.map(getPriorityLabel);
  if (summary.priorityOtherOn && summary.priorityOtherText.trim()) {
    labels.push(summary.priorityOtherText.trim());
  }
  return labels;
}
