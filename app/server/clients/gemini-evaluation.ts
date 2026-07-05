import { google } from "@ai-sdk/google";
import { generateObject, type LanguageModel } from "ai";
import {
  restaurantEvaluationSchema,
  type RestaurantEvaluationResult,
} from "~/domain/models/restaurant-evaluation-schema";

// docs/ARCHITECTURE.md「検索・評価型 b. 構造化評価呼び出し」の薄いラッパー。
// グラウンディングと併用しないため generateObject（構造化出力）を使う。
export type EvaluationInput = {
  prompt: string;
  model?: LanguageModel;
};

const DEFAULT_MODEL_ID = "gemini-2.5-flash";

export async function evaluateRestaurantCandidates(
  input: EvaluationInput,
): Promise<RestaurantEvaluationResult[]> {
  const model = input.model ?? google(DEFAULT_MODEL_ID);
  const { object } = await generateObject({
    model,
    schema: restaurantEvaluationSchema,
    prompt: input.prompt,
  });
  return object.evaluations;
}
