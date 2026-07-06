import { google } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";
import { DEFAULT_GEMINI_MODEL_ID, GEMINI_TEXT_SETTINGS } from "./gemini-models";

export type ResultsChatStreamInput = {
  prompt: string;
  model?: LanguageModel;
  abortSignal?: AbortSignal;
};

// 地図コンテキスト相談は構造化データ生成ではなく、短い本文を順次返す。
// Prompt の根拠境界は app/server/services/results-chat-prompt.ts に閉じる。
export function streamResultsChatAnswer(input: ResultsChatStreamInput) {
  const model = input.model ?? google(DEFAULT_GEMINI_MODEL_ID);
  return streamText({
    model,
    ...GEMINI_TEXT_SETTINGS,
    abortSignal: input.abortSignal,
    prompt: input.prompt,
  });
}
