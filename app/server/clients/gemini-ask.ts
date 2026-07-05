import { google } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";

// docs/ARCHITECTURE.md「オンデマンド型（店舗詳細の質問応答）」の薄いラッパー。
// UI 全体をチャットにはしないため、単発の質問応答としてストリーミングのみ提供する。
export type AskInput = {
  prompt: string;
  model?: LanguageModel;
};

const DEFAULT_MODEL_ID = "gemini-2.5-flash";

export function streamStoreAnswer(input: AskInput) {
  const model = input.model ?? google(DEFAULT_MODEL_ID);
  return streamText({ model, prompt: input.prompt });
}
