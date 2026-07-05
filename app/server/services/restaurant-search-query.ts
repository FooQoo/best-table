import { COUNTERPARTS, PRIORITIES } from "~/mocks/data";

// docs/ARCHITECTURE.md「検索・評価型 a. グラウンディング呼び出し」のプロンプト組み立て。
// ここでは自由文プロンプトの構築だけを行い、実際の Gemini 呼び出しは
// app/server/clients/gemini-search.ts に任せる。
export type RestaurantSearchQueryCondition = {
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

const PRIORITY_LABEL_BY_KEY = Object.fromEntries(
  PRIORITIES.map((p) => [p.key, p.label]),
);
const COUNTERPART_LABEL_BY_ID = Object.fromEntries(
  COUNTERPARTS.map((c) => [c.id, c.label]),
);

const TARGET_CANDIDATE_COUNT = 30;

function describeBudget(condition: RestaurantSearchQueryCondition): string | null {
  if (condition.budgetOtherOn && condition.budgetOtherText.trim()) {
    return condition.budgetOtherText.trim();
  }
  if (condition.budgetMin !== "指定なし" || condition.budgetMax !== "指定なし") {
    return `${condition.budgetMin}〜${condition.budgetMax}`;
  }
  return null;
}

function describeCounterpart(condition: RestaurantSearchQueryCondition): string | null {
  if (condition.counterpart === "other" && condition.counterpartOtherText.trim()) {
    return condition.counterpartOtherText.trim();
  }
  if (condition.counterpart) {
    return COUNTERPART_LABEL_BY_ID[condition.counterpart] ?? null;
  }
  return null;
}

function describePriorities(condition: RestaurantSearchQueryCondition): string[] {
  const labels = condition.priorities.map(
    (key) => PRIORITY_LABEL_BY_KEY[key] ?? key,
  );
  if (condition.priorityOtherOn && condition.priorityOtherText.trim()) {
    labels.push(condition.priorityOtherText.trim());
  }
  return labels;
}

export function buildGroundingPrompt(
  condition: RestaurantSearchQueryCondition,
): string {
  const lines: string[] = [];
  lines.push(
    `${condition.selectedAreas.join("・")}エリアで、接待・会食に使えるレストランを探しています。`,
  );
  lines.push(`日時: ${condition.date} ${condition.time}、人数: ${condition.people}名`);

  const counterpart = describeCounterpart(condition);
  if (counterpart) {
    lines.push(`会食の相手: ${counterpart}`);
  }

  const budget = describeBudget(condition);
  if (budget) {
    lines.push(`予算目安: ${budget}`);
  }

  const priorities = describePriorities(condition);
  if (priorities.length > 0) {
    lines.push(`重視する点: ${priorities.join("・")}`);
  }

  lines.push(
    `候補は最大${TARGET_CANDIDATE_COUNT}件まで、実在する店舗のみを挙げてください。該当が少ない場合は無理に${TARGET_CANDIDATE_COUNT}件に満たなくても構いません。`,
  );
  lines.push(
    "店舗名は英語表記や翻訳をせず、日本語の正式名称（現地表記）でそのまま出力してください。",
  );

  return lines.join("\n");
}
