import type { Restaurant } from "~/domain/models/restaurant";
import {
  EMPHASIS_LABELS,
  getEmphasisKeys,
  type EmphasisKey,
} from "~/utils/scoring";

export type ResultsChatSuggestionInput = {
  restaurants: Restaurant[];
  counterpart: string | null;
  priorities: string[];
  lastQuestion?: string;
  lastAnswer?: string;
};

export const INITIAL_RESULTS_CHAT_QUESTIONS = [
  "この条件なら、まず比較に入れるべき店はどれですか？",
  "役員クラスとの会食で避けた方がよさそうな懸念はありますか？",
  "個室・落ち着き・アクセスのバランスが良い候補はどれですか？",
  "いま表示されている店舗の中で、比較に入れる3件を選ぶならどれですか？",
];

const FALLBACK_FOLLOW_UP_QUESTIONS = [
  "懸念が少ない順に3件だけ並べるとどうなりますか？",
  "予算内に収まりやすそうな候補を優先するとどれですか？",
  "初回取引先向けに堅すぎない候補はありますか？",
  "比較に入れない方がよい候補と理由を教えてください。",
  "予約前に店舗へ確認すべきことを優先順で教えてください。",
  "同席者へ説明しやすい選定理由にするとどうなりますか？",
];

const PRIORITY_TO_EMPHASIS: Record<string, EmphasisKey> = {
  calm: "quiet",
  room: "room",
  prestige: "prestige",
  service: "service",
  access: "access",
  budget: "budgetLabel",
};

const UNSAFE_SUGGESTION_PATTERNS = [
  /空席.*(ある|あります|取れる|取れます|確保|確定)/,
  /予約.*(できる|できます|成立|確定|取れる|取れます)/,
  /在庫.*(ある|あります|確保|確定)/,
];

export function buildResultsChatSuggestions(
  input: ResultsChatSuggestionInput,
): string[] {
  const candidates: string[] = [];
  const emphasisLabels = buildEmphasisLabels(input);
  const topStoreNames = input.restaurants
    .slice(0, 3)
    .map((restaurant) => restaurant.name);
  const hasConcerns = input.restaurants.some(
    (restaurant) => restaurant.concerns.length > 0,
  );

  if (emphasisLabels.length > 0) {
    candidates.push(
      `${emphasisLabels.join("・")}を重視すると、比較に残す候補はどれですか？`,
    );
  }

  if (topStoreNames.length >= 2) {
    candidates.push(
      `${topStoreNames.slice(0, 2).join("と")}の違いを接待向けに比べるとどうなりますか？`,
    );
  }

  if (hasConcerns || input.lastQuestion?.includes("懸念")) {
    candidates.push("懸念が大きい候補と、予約前に確認すべき点を教えてください。");
  }

  if (input.counterpart === "exec") {
    candidates.push("役員クラス向けに、格式・個室・接客の不安が少ない順で見るとどうなりますか？");
  } else if (input.counterpart === "boss") {
    candidates.push("社内上司向けに、予算・落ち着き・アクセスのバランスで選ぶならどれですか？");
  } else if (input.counterpart === "partner") {
    candidates.push("初回取引先向けに、堅すぎず会話しやすい候補はどれですか？");
  }

  if (input.lastAnswer?.includes("確認")) {
    candidates.push("最終候補にする前に確認すべき項目を店舗別に整理してください。");
  }

  candidates.push(...FALLBACK_FOLLOW_UP_QUESTIONS);
  return normalizeResultsChatSuggestions(candidates);
}

export function normalizeResultsChatSuggestions(questions: string[]): string[] {
  const normalized: string[] = [];
  for (const question of questions) {
    const trimmed = question.trim();
    if (!trimmed) continue;
    if (isUnsafeResultsChatSuggestion(trimmed)) continue;
    if (normalized.includes(trimmed)) continue;
    normalized.push(trimmed);
    if (normalized.length === 4) break;
  }
  return normalized;
}

export function isUnsafeResultsChatSuggestion(question: string): boolean {
  return UNSAFE_SUGGESTION_PATTERNS.some((pattern) => pattern.test(question));
}

function buildEmphasisLabels(input: ResultsChatSuggestionInput): string[] {
  const keys = [
    ...getEmphasisKeys(input.counterpart),
    ...input.priorities
      .map((priority) => PRIORITY_TO_EMPHASIS[priority])
      .filter((key): key is EmphasisKey => Boolean(key)),
  ];
  return Array.from(new Set(keys)).map((key) => EMPHASIS_LABELS[key]);
}
