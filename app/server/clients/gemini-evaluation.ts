import { google } from "@ai-sdk/google";
import { generateObject, Output, streamText, type LanguageModel } from "ai";
import {
  restaurantEvaluationItemSchema,
  restaurantEvaluationSchema,
  type RestaurantEvaluationResult,
} from "~/domain/models/restaurant-evaluation-schema";
import {
  GEMINI_EVALUATION_MODEL_ID,
  GEMINI_STRUCTURED_SETTINGS,
} from "./gemini-models";

// docs/ARCHITECTURE.md「検索・評価型 b. 構造化評価呼び出し」の薄いラッパー。
// グラウンディングと併用しないため generateObject（構造化出力）を使う。
export type EvaluationInput = {
  prompt: string;
  model?: LanguageModel;
};

export async function evaluateRestaurantCandidates(
  input: EvaluationInput,
): Promise<RestaurantEvaluationResult[]> {
  const model = input.model ?? google(GEMINI_EVALUATION_MODEL_ID);
  const { object } = await generateObject({
    model,
    ...GEMINI_STRUCTURED_SETTINGS,
    schema: restaurantEvaluationSchema,
    prompt: input.prompt,
  });
  return object.evaluations;
}

export function streamRestaurantEvaluations(
  input: EvaluationInput,
): AsyncIterable<RestaurantEvaluationResult> {
  const model = input.model ?? google(GEMINI_EVALUATION_MODEL_ID);
  const { elementStream } = streamText({
    model,
    ...GEMINI_STRUCTURED_SETTINGS,
    output: Output.array({ element: restaurantEvaluationItemSchema }),
    prompt: input.prompt,
  });
  return elementStream;
}
