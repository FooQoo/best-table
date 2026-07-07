import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import {
  MAX_RESULTS_CHAT_QUESTION_LENGTH,
  MAX_RESULTS_CHAT_RESTAURANTS,
  validateResultsChatRequest,
} from "~/routes/api.results.chat";

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
  ikyu: null,
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    question: "比較に入れるべき店は？",
    restaurants: [restaurant],
    bookingSummary,
    ...overrides,
  };
}

describe("validateResultsChatRequest", () => {
  it("accepts a valid question, visible restaurants, and hearing summary", () => {
    const result = validateResultsChatRequest(request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.question).toBe("比較に入れるべき店は？");
      expect(result.value.restaurants[0].name).toBe("銀座 接待店 A");
    }
  });

  it("rejects empty or too long questions", () => {
    expect(validateResultsChatRequest(request({ question: "  " })).ok).toBe(false);
    expect(
      validateResultsChatRequest({
        ...request(),
        question: "あ".repeat(MAX_RESULTS_CHAT_QUESTION_LENGTH + 1),
      }).ok,
    ).toBe(false);
  });

  it("rejects empty, too many, or invalid restaurants", () => {
    expect(validateResultsChatRequest(request({ restaurants: [] })).ok).toBe(false);
    expect(
      validateResultsChatRequest(
        request({
          restaurants: Array.from(
            { length: MAX_RESULTS_CHAT_RESTAURANTS + 1 },
            (_, index) => ({ ...restaurant, id: `store-${index}` }),
          ),
        }),
      ).ok,
    ).toBe(false);
    expect(
      validateResultsChatRequest(
        request({ restaurants: [{ ...restaurant, evidence: ["unknown"] }] }),
      ).ok,
    ).toBe(false);
  });

  it("rejects invalid hearing summaries", () => {
    expect(
      validateResultsChatRequest(
        request({ bookingSummary: { ...bookingSummary, people: "4" } }),
      ).ok,
    ).toBe(false);
  });
});
