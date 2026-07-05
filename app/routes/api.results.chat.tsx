import type { ActionFunctionArgs } from "react-router";
import { streamResultsChatAnswer } from "~/server/clients/gemini-results-chat";
import { buildResultsChatPrompt } from "~/server/services/results-chat-prompt";
import {
  MAX_RESULTS_CHAT_QUESTION_LENGTH,
  MAX_RESULTS_CHAT_RESTAURANTS,
  validateResultsChatBaseFields,
} from "~/server/services/results-chat-validation";

export {
  MAX_RESULTS_CHAT_QUESTION_LENGTH,
  MAX_RESULTS_CHAT_RESTAURANTS,
};
export const validateResultsChatRequest = validateResultsChatBaseFields;

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

  const validation = validateResultsChatRequest(body);
  if (!validation.ok) {
    return Response.json(
      { error: validation.message },
      { status: validation.status },
    );
  }

  const prompt = buildResultsChatPrompt(validation.value);

  try {
    const result = streamResultsChatAnswer({ prompt });
    return result.toTextStreamResponse({
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return Response.json(
      { error: "AI回答の生成に失敗しました。" },
      { status: 500 },
    );
  }
}
