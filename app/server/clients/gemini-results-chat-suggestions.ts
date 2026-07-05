import { google } from "@ai-sdk/google";
import { generateObject, type LanguageModel } from "ai";
import { resultsChatSuggestionsSchema } from "~/domain/models/results-chat-suggestions-schema";

export type ResultsChatSuggestionsInput = {
  prompt: string;
  model?: LanguageModel;
};

const DEFAULT_MODEL_ID = "gemini-2.5-flash";

// 地図コンテキスト相談の回答後に、深掘り質問4件を構造化出力で生成する薄いラッパー。
export async function generateResultsChatSuggestions(
  input: ResultsChatSuggestionsInput,
): Promise<string[]> {
  const model = input.model ?? google(DEFAULT_MODEL_ID);
  const { object } = await generateObject({
    model,
    schema: resultsChatSuggestionsSchema,
    prompt: input.prompt,
  });
  return object.questions;
}
