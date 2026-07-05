import { google } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";

export type ResultsChatStreamInput = {
  prompt: string;
  model?: LanguageModel;
};

const DEFAULT_MODEL_ID = "gemini-2.5-flash";

// 地図コンテキスト相談は構造化データ生成ではなく、短い本文を順次返す。
// Prompt の根拠境界は app/server/services/results-chat-prompt.ts に閉じる。
export function streamResultsChatAnswer(input: ResultsChatStreamInput) {
  const model = input.model ?? google(DEFAULT_MODEL_ID);
  return streamText({
    model,
    prompt: input.prompt,
  });
}
