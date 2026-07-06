import {
  describeBudget,
  describeCounterpart,
  describePriorities,
} from "~/domain/services/booking-summary-format";

// docs/ARCHITECTURE.md「検索・評価型」の条件組み立て。
// a. 施設検索（Places API Text Search）向けのクエリ文字列と、
// b. 構造化評価（Gemini）向けの条件サマリーの両方をここに集約する。
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

// Places API Text Search の textQuery に使う短い検索キーワード。
// AI評価用の文章的な優先ラベル（例:「個室・半個室を優先」）とは別に、
// 検索エンジンが解釈しやすい語だけを対応させる。
const PRIORITY_SEARCH_KEYWORDS: Record<string, string> = {
  calm: "落ち着いた",
  room: "個室",
  prestige: "高級",
  service: "接客が良い",
  access: "駅近",
  budget: "",
};

// docs/ARCHITECTURE.md「検索・評価型 a. 施設検索」: エリア名 + 用途 + 重視条件の
// キーワードだけを含む短い検索クエリ。自由文の説明や条件の断定はしない
// （Places API 側の実在店舗検索に絞り込みヒントを渡すだけの用途）。
export function buildPlaceSearchQuery(
  condition: RestaurantSearchQueryCondition,
): string {
  const keywords = condition.priorities
    .map((key) => PRIORITY_SEARCH_KEYWORDS[key])
    .filter((keyword): keyword is string => Boolean(keyword));

  return [
    condition.selectedAreas.join("・"),
    "接待",
    "レストラン",
    ...keywords,
  ].join(" ");
}

// docs/ARCHITECTURE.md「検索・評価型 b. 構造化評価呼び出し」向けの条件サマリー。
// Places API から取得した実在の候補一覧に対して AI が適性を評価する際の背景説明として使う
// （店舗探索自体はもう AI に依頼しないため、候補数や表記に関する指示は含めない）。
export function buildBookingConditionSummary(
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

  return lines.join("\n");
}

// ログ出力用の要約。個人情報になり得ない範囲の条件だけを残す。
// app/server/services/restaurant-search.ts と /api/restaurants/search resource route の
// 両方でほぼ同じ実装が重複していたため、条件の型と一緒にここへ集約する。
export function summarizeRestaurantSearchCondition(
  condition: RestaurantSearchQueryCondition,
) {
  return {
    areas: condition.selectedAreas,
    date: condition.date,
    time: condition.time,
    people: condition.people,
    budget:
      condition.budgetOtherOn && condition.budgetOtherText.trim()
        ? "custom"
        : `${condition.budgetMin}-${condition.budgetMax}`,
    priorities: condition.priorities,
    priorityOtherOn: condition.priorityOtherOn,
    counterpart: condition.counterpart,
  };
}
