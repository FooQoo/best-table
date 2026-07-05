import { isRestaurant, type Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";

export const MAX_RESULTS_CHAT_QUESTION_LENGTH = 400;
export const MAX_RESULTS_CHAT_RESTAURANTS = 30;

export type ResultsChatBaseFields = {
  question: string;
  restaurants: Restaurant[];
  bookingSummary: ResultsChatBookingSummary;
};

export type ResultsChatValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

// `/api/results/chat` と `/api/results/chat/suggestions` で共通の入力検証。
export function validateResultsChatBaseFields(
  value: unknown,
): ResultsChatValidationResult<ResultsChatBaseFields> {
  if (typeof value !== "object" || value === null) {
    return { ok: false, status: 400, message: "リクエスト形式が不正です。" };
  }

  const body = value as Record<string, unknown>;
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return { ok: false, status: 400, message: "質問文を入力してください。" };
  }
  if (question.length > MAX_RESULTS_CHAT_QUESTION_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `質問文は${MAX_RESULTS_CHAT_QUESTION_LENGTH}文字以内で入力してください。`,
    };
  }

  if (!Array.isArray(body.restaurants)) {
    return { ok: false, status: 400, message: "表示中店舗の形式が不正です。" };
  }
  if (body.restaurants.length === 0) {
    return { ok: false, status: 400, message: "相談できる表示中店舗がありません。" };
  }
  if (body.restaurants.length > MAX_RESULTS_CHAT_RESTAURANTS) {
    return {
      ok: false,
      status: 400,
      message: `表示中店舗は${MAX_RESULTS_CHAT_RESTAURANTS}件以内で送信してください。`,
    };
  }
  if (!body.restaurants.every(isRestaurant)) {
    return { ok: false, status: 400, message: "表示中店舗の内容が不正です。" };
  }

  if (!isBookingSummary(body.bookingSummary)) {
    return { ok: false, status: 400, message: "ヒアリング条件の形式が不正です。" };
  }

  return {
    ok: true,
    value: {
      question,
      restaurants: body.restaurants,
      bookingSummary: body.bookingSummary,
    },
  };
}

export function isBookingSummary(value: unknown): value is ResultsChatBookingSummary {
  if (typeof value !== "object" || value === null) return false;
  const summary = value as Record<string, unknown>;

  return (
    Array.isArray(summary.selectedAreas) &&
    summary.selectedAreas.every((area) => typeof area === "string") &&
    typeof summary.date === "string" &&
    typeof summary.time === "string" &&
    typeof summary.people === "number" &&
    Number.isFinite(summary.people) &&
    typeof summary.budgetMin === "string" &&
    typeof summary.budgetMax === "string" &&
    typeof summary.budgetOtherOn === "boolean" &&
    typeof summary.budgetOtherText === "string" &&
    Array.isArray(summary.priorities) &&
    summary.priorities.every((priority) => typeof priority === "string") &&
    typeof summary.priorityOtherOn === "boolean" &&
    typeof summary.priorityOtherText === "string" &&
    (typeof summary.counterpart === "string" || summary.counterpart === null) &&
    typeof summary.counterpartOtherText === "string"
  );
}
