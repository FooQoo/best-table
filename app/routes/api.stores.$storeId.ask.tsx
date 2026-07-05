import type { ActionFunctionArgs } from "react-router";
import { isRestaurant } from "~/domain/models/restaurant";
import { streamStoreAnswer } from "~/server/clients/gemini-ask";
import { buildStoreAskPrompt } from "~/server/services/store-ask-prompt";

// docs/ARCHITECTURE.md「オンデマンド型（店舗詳細の質問応答）」の resource route。
// docs/DESIGN.md のガードレール（自由入力は短く限定する）に従い、質問文の長さを制限する。
const MAX_QUESTION_LENGTH = 100;

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();
  const { store, question } = body as { store: unknown; question: unknown };

  if (!isRestaurant(store)) {
    return new Response("invalid store", { status: 400 });
  }
  if (
    typeof question !== "string" ||
    question.trim().length === 0 ||
    question.length > MAX_QUESTION_LENGTH
  ) {
    return new Response("invalid question", { status: 400 });
  }

  const prompt = buildStoreAskPrompt(store, question.trim());
  const result = streamStoreAnswer({ prompt });
  return result.toTextStreamResponse();
}
