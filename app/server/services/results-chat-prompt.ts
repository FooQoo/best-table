import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import {
  describeBudget,
  describeCounterpart,
  describePriorities,
} from "~/domain/services/booking-summary-format";
import { MATCH_TIER_LABELS } from "~/utils/evidence-labels";

export type ResultsChatPromptInput = {
  question: string;
  restaurants: Restaurant[];
  bookingSummary: ResultsChatBookingSummary;
};

export type ResultsChatSuggestionsPromptInput = {
  question: string;
  answer: string;
  restaurants: Restaurant[];
};

export function buildResultsChatPrompt(input: ResultsChatPromptInput): string {
  const lines: string[] = [];
  lines.push("あなたは接待・会食向けレストラン比較を支援するAIです。");
  lines.push("以下の表示中店舗とヒアリング条件だけを根拠に、日本語で短く回答してください。");
  lines.push("");
  lines.push("厳守ルール:");
  lines.push("- 表示中店舗に含まれない店舗を新規提案しない。");
  lines.push("- 空席、予約成立、予約可否、在庫、未取得の口コミ本文、未取得のメニュー本文を断定しない。");
  lines.push("- 不明な事実は不明と明示し、予約前に確認すべき事項として表現する。");
  lines.push("- 回答は比較、懸念、次アクションが分かる形にし、長くしすぎない。");
  lines.push("- 回答は最大6行。前置きは省き、必要なら箇条書きにする。");
  lines.push("- 店舗名は表示中店舗の名称をそのまま使う。");
  lines.push("");
  lines.push("ヒアリング条件:");
  lines.push(formatBookingSummary(input.bookingSummary));
  lines.push("");
  lines.push("表示中店舗:");
  lines.push(formatRestaurants(input.restaurants));
  lines.push("");
  lines.push("ユーザーの質問:");
  lines.push(input.question);

  return lines.join("\n");
}

export function buildResultsChatSuggestionsPrompt(
  input: ResultsChatSuggestionsPromptInput,
): string {
  const lines: string[] = [];
  lines.push("あなたは接待・会食向けレストラン比較を支援するAIです。");
  lines.push(
    "直前の質問と回答を踏まえ、ユーザーがこのAIにさらに深掘りして尋ねたくなる質問を4つ日本語で作成してください。",
  );
  lines.push("");
  lines.push("厳守ルール:");
  lines.push(
    "- 生成する4件はすべて「ユーザーがAIに尋ねる質問」にする。AIがユーザーに尋ねる質問（好みや条件を聞き返す形）にしない。",
  );
  lines.push(
    "- 例: 「懸念が大きい候補はどれですか？」のようなユーザー視点の一人称の問いにする。「どのような点を重視されますか？」のような聞き返しにしない。",
  );
  lines.push("- 表示中店舗に含まれない店舗を前提にした質問にしない。");
  lines.push("- 空席、予約成立、予約可否、在庫を前提にした質問にしない。");
  lines.push("- 直前の回答をさらに掘り下げる、比較・懸念・確認事項の観点にする。");
  lines.push("- 各質問は一文、40文字程度までの短さにする。");
  lines.push("- 4件はそれぞれ異なる観点にし、同じ内容の言い換えにしない。");
  lines.push("");
  lines.push("表示中店舗の名称:");
  lines.push(formatRestaurantNames(input.restaurants));
  lines.push("");
  lines.push("直前の質問:");
  lines.push(input.question);
  lines.push("");
  lines.push("直前の回答:");
  lines.push(input.answer);

  return lines.join("\n");
}

function formatBookingSummary(summary: ResultsChatBookingSummary): string {
  const lines: string[] = [];
  lines.push(`- エリア: ${summary.selectedAreas.join("・") || "未指定"}`);
  lines.push(`- 日時: ${summary.date} ${summary.time}`);
  lines.push(`- 人数: ${summary.people}名`);

  const counterpart = describeCounterpart(summary);
  if (counterpart) lines.push(`- 会食の相手: ${counterpart}`);

  const budget = describeBudget(summary);
  if (budget) lines.push(`- 予算目安: ${budget}`);

  const priorities = describePriorities(summary);
  if (priorities.length > 0) {
    lines.push(`- 重視する点: ${priorities.join("・")}`);
  }

  return lines.join("\n");
}

function formatRestaurants(restaurants: Restaurant[]): string {
  return restaurants
    .map((restaurant, index) => {
      const concerns = restaurant.concerns
        .map((concern) => concern.text)
        .filter(Boolean)
        .join(" / ");
      return [
        `${index + 1}. ${restaurant.name}`,
        `エリア: ${restaurant.area}`,
        `マッチ度: ${restaurant.matchTier ? MATCH_TIER_LABELS[restaurant.matchTier] : "未評価"}`,
        `個室: ${restaurant.room ?? "情報なし"}`,
        `静かさ: ${restaurant.quiet ?? "情報なし"}`,
        `格式: ${restaurant.prestige ?? "情報なし"}`,
        `接客: ${restaurant.service ?? "情報なし"}`,
        `予算目安: ${restaurant.budgetLabel ?? "情報なし"}`,
        `アクセス: ${restaurant.access ?? "情報なし"}`,
        `懸念: ${concerns || "目立つ懸念なし"}`,
        `推奨理由: ${restaurant.matchingSummary ?? "未生成"}`,
      ].join(" / ");
    })
    .join("\n");
}

// おすすめ質問の生成には、直前の回答が既に踏まえている店舗詳細まで渡す必要はない。
// 表示中にない店舗名を前提にした質問を作らせないための最小限の根拠として名称だけ渡す。
function formatRestaurantNames(restaurants: Restaurant[]): string {
  return restaurants.map((restaurant) => `- ${restaurant.name}`).join("\n");
}
