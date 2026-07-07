import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import {
  buildResultsChatSuggestions,
  isUnsafeResultsChatSuggestion,
  normalizeResultsChatSuggestions,
} from "./results-chat-suggestions";

const baseRestaurant: Restaurant = {
  id: "a",
  placeId: "places/a",
  name: "銀座 接待店 A",
  area: "銀座",
  address: null,
  location: null,
  phone: null,
  photoUrl: null,
  genre: null,
  matchTier: "high",
  room: "個室あり",
  quiet: "◎",
  prestige: "◎",
  service: "○",
  access: "銀座駅から徒歩3分",
  budgetLabel: "¥15,000前後",
  concerns: [{ text: "人気店のため事前確認が必要", evidence: ["review"] }],
  matchingSummary: "個室と格式のバランスが良い候補です。",
  evidence: ["review"],
  confidence: "medium",
  generatedAt: "2026-07-05T00:00:00.000Z",
  ikyu: null,
};

describe("buildResultsChatSuggestions", () => {
  it("always returns four safe suggestions", () => {
    const suggestions = buildResultsChatSuggestions({
      restaurants: [baseRestaurant],
      counterpart: null,
      priorities: [],
      lastQuestion: "比較したい",
      lastAnswer: "確認が必要です。",
    });

    expect(suggestions).toHaveLength(4);
    expect(suggestions.every((question) => !isUnsafeResultsChatSuggestion(question))).toBe(true);
  });

  it("reflects counterpart and priority context", () => {
    const execSuggestions = buildResultsChatSuggestions({
      restaurants: [baseRestaurant],
      counterpart: "exec",
      priorities: ["room"],
    });
    const bossSuggestions = buildResultsChatSuggestions({
      restaurants: [baseRestaurant],
      counterpart: "boss",
      priorities: ["budget"],
    });

    expect(execSuggestions.join("\n")).toContain("格式・個室・接客");
    expect(bossSuggestions.join("\n")).toContain("予算・落ち着き・アクセス");
    expect(execSuggestions).not.toEqual(bossSuggestions);
  });
});

describe("normalizeResultsChatSuggestions", () => {
  it("deduplicates questions and drops availability-guaranteeing wording", () => {
    expect(
      normalizeResultsChatSuggestions([
        "予約できますか？",
        "懸念を教えてください。",
        "懸念を教えてください。",
        "空席がある店はどれですか？",
        "比較に入れる店はどれですか？",
        "確認事項を整理してください。",
        "予算で見るとどれですか？",
      ]),
    ).toEqual([
      "懸念を教えてください。",
      "比較に入れる店はどれですか？",
      "確認事項を整理してください。",
      "予算で見るとどれですか？",
    ]);
  });
});
