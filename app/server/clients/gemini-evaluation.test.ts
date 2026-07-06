import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { evaluateRestaurantCandidates } from "./gemini-evaluation";

function mockModelReturning(evaluations: unknown[]) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [
        { type: "text", text: JSON.stringify({ evaluations }) },
      ],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describe("evaluateRestaurantCandidates", () => {
  it("returns the structured evaluations produced by the model", async () => {
    const model = mockModelReturning([
      {
        candidateName: "桂",
        displayNameJa: null,
        genre: "japanese",
        score: 90,
        room: "個室あり",
        quiet: "◎",
        prestige: "◎",
        service: "◎",
        access: "銀座駅周辺",
        budgetLabel: "¥20,000",
        concerns: [],
        matchingSummary: "接待に適した候補です。",
        evidence: ["description"],
        confidence: "medium",
      },
    ]);

    const result = await evaluateRestaurantCandidates({ model, prompt: "test" });

    expect(result).toEqual([
      {
        candidateName: "桂",
        displayNameJa: null,
        genre: "japanese",
        score: 90,
        room: "個室あり",
        quiet: "◎",
        prestige: "◎",
        service: "◎",
        access: "銀座駅周辺",
        budgetLabel: "¥20,000",
        concerns: [],
        matchingSummary: "接待に適した候補です。",
        evidence: ["description"],
        confidence: "medium",
      },
    ]);
  });

  it("returns an empty array when the model finds no evaluable candidates", async () => {
    const model = mockModelReturning([]);
    const result = await evaluateRestaurantCandidates({ model, prompt: "test" });
    expect(result).toEqual([]);
  });
});
