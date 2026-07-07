import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import {
  MAX_RESULTS_CHAT_ANSWER_LENGTH,
  validateResultsChatSuggestionsRequest,
} from "~/routes/api.results.chat.suggestions";

const bookingSummary: ResultsChatBookingSummary = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "指定なし",
  budgetMax: "指定なし",
  budgetOtherOn: false,
  budgetOtherText: "",
  priorities: ["room"],
  priorityOtherOn: false,
  priorityOtherText: "",
  counterpart: "exec",
  counterpartOtherText: "",
};

const restaurant: Restaurant = {
  id: "a",
  placeId: "places/a",
  name: "銀座 接待店 A",
  area: "銀座",
  address: null,
  location: null,
  phone: null,
  photoUrl: null,
  genre: null,
  matchTier: null,
  room: null,
  quiet: null,
  prestige: null,
  service: null,
  access: null,
  budgetLabel: null,
  concerns: [],
  matchingSummary: null,
  evidence: [],
  confidence: null,
  generatedAt: null,
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    question: "比較に入れるべき店は？",
    answer: "銀座 接待店 A を中心に見ると判断しやすいです。",
    restaurants: [restaurant],
    bookingSummary,
    ...overrides,
  };
}

describe("validateResultsChatSuggestionsRequest", () => {
  it("accepts a valid question, answer, visible restaurants, and hearing summary", () => {
    const result = validateResultsChatSuggestionsRequest(request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.answer).toBe("銀座 接待店 A を中心に見ると判断しやすいです。");
    }
  });

  it("rejects empty or too long answers", () => {
    expect(
      validateResultsChatSuggestionsRequest(request({ answer: "  " })).ok,
    ).toBe(false);
    expect(
      validateResultsChatSuggestionsRequest(
        request({ answer: "あ".repeat(MAX_RESULTS_CHAT_ANSWER_LENGTH + 1) }),
      ).ok,
    ).toBe(false);
  });

  it("rejects empty visible restaurants like the chat request does", () => {
    expect(
      validateResultsChatSuggestionsRequest(request({ restaurants: [] })).ok,
    ).toBe(false);
  });
});
