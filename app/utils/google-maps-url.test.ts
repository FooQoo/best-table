import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { buildGoogleMapsUrl } from "./google-maps-url";

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

describe("buildGoogleMapsUrl", () => {
  it("uses place_id when a places/... placeId is available", () => {
    expect(buildGoogleMapsUrl({ ...store, placeId: "places/ChIJ123" })).toBe(
      "https://www.google.com/maps/place/?q=place_id:ChIJ123",
    );
  });

  it("also treats a raw place id as place_id", () => {
    expect(buildGoogleMapsUrl({ ...store, placeId: "ChIJraw" })).toBe(
      "https://www.google.com/maps/place/?q=place_id:ChIJraw",
    );
  });

  it("falls back to a name and address search when placeId is missing", () => {
    expect(
      buildGoogleMapsUrl({
        ...store,
        address: "東京都中央区銀座4-6-16",
      }),
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=%E6%97%A5%E6%9C%AC%E6%96%99%E7%90%86%20%E8%8A%B1%E6%98%8E%E3%81%8B%E3%82%8A%20%E6%9D%B1%E4%BA%AC%E9%83%BD%E4%B8%AD%E5%A4%AE%E5%8C%BA%E9%8A%80%E5%BA%A74-6-16",
    );
  });

  it("falls back to a name and area search when address is missing", () => {
    expect(buildGoogleMapsUrl(store)).toBe(
      "https://www.google.com/maps/search/?api=1&query=%E6%97%A5%E6%9C%AC%E6%96%99%E7%90%86%20%E8%8A%B1%E6%98%8E%E3%81%8B%E3%82%8A%20%E9%8A%80%E5%BA%A7",
    );
  });
});
