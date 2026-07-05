import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { generateResultsChatSuggestions } from "./gemini-results-chat-suggestions";

function mockModelReturning(questions: string[]) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify({ questions }) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describe("generateResultsChatSuggestions", () => {
  it("returns the structured follow-up questions produced by the model", async () => {
    const model = mockModelReturning([
      "懸念が大きい候補はどれですか？",
      "予算内で比較するとどうなりますか？",
      "個室のある候補はどれですか？",
      "接客の評判が良い候補はどれですか？",
    ]);

    const result = await generateResultsChatSuggestions({ model, prompt: "test" });

    expect(result).toEqual([
      "懸念が大きい候補はどれですか？",
      "予算内で比較するとどうなりますか？",
      "個室のある候補はどれですか？",
      "接客の評判が良い候補はどれですか？",
    ]);
  });
});
