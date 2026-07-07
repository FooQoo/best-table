import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { buildIkyuSearchUrl } from "./ikyu-search-url";

const store: Restaurant = {
  id: "r1",
  placeId: null,
  name: "日本料理 花明かり",
  genre: null,
  area: "銀座",
  address: null,
  location: null,
  phone: null,
  photoUrl: null,
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

describe("buildIkyuSearchUrl", () => {
  it("店舗名を term にした一休.comの検索URLを組み立てる", () => {
    expect(buildIkyuSearchUrl(store)).toBe(
      "https://restaurant.ikyu.com/search?term=" +
        encodeURIComponent("日本料理 花明かり").replace(/%20/g, "+"),
    );
  });

  it("店舗名の空白を + でエンコードする（URLSearchParams 相当）", () => {
    const withSymbols = { ...store, name: "和匠 銀座松月" };
    expect(buildIkyuSearchUrl(withSymbols)).toBe(
      "https://restaurant.ikyu.com/search?term=%E5%92%8C%E5%8C%A0+%E9%8A%80%E5%BA%A7%E6%9D%BE%E6%9C%88",
    );
  });
});
