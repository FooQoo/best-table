import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { buildStoreAskPrompt } from "./store-ask-prompt";

const baseStore: Restaurant = {
  id: "s1",
  placeId: null,
  name: "日本料理 花明かり",
  genre: "japanese",
  area: "銀座",
  address: null,
  location: null,
  phone: null,
  photoUrl: null,
  score: 94,
  room: "個室あり",
  quiet: "◎",
  prestige: "◎",
  service: "◎",
  access: "銀座駅 徒歩3分",
  budgetLabel: "¥30,000",
  concerns: [{ text: "カウンター越しの接客になる場合がある", evidence: ["seat"] }],
  matchingSummary: "落ち着いた個室が強み。",
  evidence: ["review", "photo"],
  confidence: "high",
  generatedAt: "2026-07-04T09:00:00.000Z",
};

describe("buildStoreAskPrompt", () => {
  it("includes the store's known facts", () => {
    const prompt = buildStoreAskPrompt(baseStore, "個室はありますか？");
    expect(prompt).toContain("日本料理 花明かり");
    expect(prompt).toContain("個室あり");
    expect(prompt).toContain("¥30,000");
    expect(prompt).toContain("落ち着いた個室が強み。");
    expect(prompt).toContain("カウンター越しの接客になる場合がある");
  });

  it("includes the user's question", () => {
    const prompt = buildStoreAskPrompt(baseStore, "個室はありますか？");
    expect(prompt).toContain("個室はありますか？");
  });

  it("instructs the model not to assert vacancy or reservation, and not to fabricate facts", () => {
    const prompt = buildStoreAskPrompt(baseStore, "個室はありますか？");
    expect(prompt).toMatch(/空席|予約/);
    expect(prompt).toMatch(/作らない|捏造|断定/);
  });

  it("does not fabricate a genre or concern when the store has none", () => {
    const storeWithoutExtras: Restaurant = {
      ...baseStore,
      genre: null,
      concerns: [],
    };
    const prompt = buildStoreAskPrompt(storeWithoutExtras, "個室はありますか？");
    expect(prompt).toContain("特になし");
  });
});
