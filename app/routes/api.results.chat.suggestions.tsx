import type { ActionFunctionArgs } from "react-router";
import { generateResultsChatSuggestions } from "~/server/clients/gemini-results-chat-suggestions";
import { buildResultsChatSuggestionsPrompt } from "~/server/services/results-chat-prompt";
import {
  type ResultsChatBaseFields,
  validateResultsChatBaseFields,
} from "~/server/services/results-chat-validation";
import {
  buildResultsChatSuggestions,
  normalizeResultsChatSuggestions,
} from "~/utils/results-chat-suggestions";

export const MAX_RESULTS_CHAT_ANSWER_LENGTH = 2000;

type ResultsChatSuggestionsRequest = ResultsChatBaseFields & { answer: string };

type ValidationResult =
  | { ok: true; value: ResultsChatSuggestionsRequest }
  | { ok: false; status: number; message: string };

export function validateResultsChatSuggestionsRequest(
  value: unknown,
): ValidationResult {
  const base = validateResultsChatBaseFields(value);
  if (!base.ok) return base;

  const body = value as Record<string, unknown>;
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!answer) {
    return { ok: false, status: 400, message: "直前の回答がありません。" };
  }
  if (answer.length > MAX_RESULTS_CHAT_ANSWER_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `直前の回答は${MAX_RESULTS_CHAT_ANSWER_LENGTH}文字以内にしてください。`,
    };
  }

  return { ok: true, value: { ...base.value, answer } };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON body is required" }, { status: 400 });
  }

  const validation = validateResultsChatSuggestionsRequest(body);
  if (!validation.ok) {
    return Response.json(
      { error: validation.message },
      { status: validation.status },
    );
  }

  // deterministic な候補は AI 生成が失敗・不足した場合の安全網として常に用意する。
  const fallbackQuestions = buildResultsChatSuggestions({
    restaurants: validation.value.restaurants,
    counterpart: validation.value.bookingSummary.counterpart,
    priorities: validation.value.bookingSummary.priorities,
    lastQuestion: validation.value.question,
    lastAnswer: validation.value.answer,
  });

  try {
    const prompt = buildResultsChatSuggestionsPrompt(validation.value);
    const generatedQuestions = await generateResultsChatSuggestions({ prompt });
    const questions = normalizeResultsChatSuggestions([
      ...generatedQuestions,
      ...fallbackQuestions,
    ]);
    return Response.json({ questions });
  } catch {
    return Response.json({ questions: fallbackQuestions });
  }
}
