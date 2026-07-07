import { google } from "@ai-sdk/google";
import { generateObject, type LanguageModel } from "ai";
import { resultsChatSuggestionsSchema } from "~/domain/models/results-chat-suggestions-schema";
import {
  GEMINI_CHAT_MODEL_ID,
  GEMINI_SUGGESTIONS_SETTINGS,
} from "./gemini-models";

export type ResultsChatSuggestionsInput = {
  prompt: string;
  model?: LanguageModel;
};

// 地図コンテキスト相談の回答後に、深掘り質問4件を構造化出力で生成する薄いラッパー。
export async function generateResultsChatSuggestions(
  input: ResultsChatSuggestionsInput,
): Promise<string[]> {
  const model = input.model ?? google(GEMINI_CHAT_MODEL_ID);
  const { object } = await generateObject({
    model,
    ...GEMINI_SUGGESTIONS_SETTINGS,
    schema: resultsChatSuggestionsSchema,
    prompt: input.prompt,
  });
  return object.questions;
}
