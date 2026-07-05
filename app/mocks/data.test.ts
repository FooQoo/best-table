import { describe, expect, it } from "vitest";
import { isRestaurant } from "~/domain/models/restaurant";
import { MAP_RENDERING_MOCK_RESTAURANTS, STORES } from "./data";

describe("STORES がドメインモデル Restaurant の形状を満たす", () => {
  it("すべての店舗が isRestaurant を満たす", () => {
    STORES.forEach((store) => {
      expect(isRestaurant(store)).toBe(true);
    });
  });

  it("すべての店舗が concerns 配列を持つ（空配列可）", () => {
    STORES.forEach((store) => {
      expect(Array.isArray(store.concerns)).toBe(true);
      store.concerns.forEach((concern) => {
        expect(typeof concern.text).toBe("string");
        expect(Array.isArray(concern.evidence)).toBe(true);
        expect(concern.evidence.length).toBeGreaterThan(0);
      });
    });
  });

  it("すべての店舗が空でない matchingSummary を持つ", () => {
    STORES.forEach((store) => {
      expect(typeof store.matchingSummary).toBe("string");
      expect((store.matchingSummary ?? "").length).toBeGreaterThan(0);
    });
  });

  it("すべての店舗が根拠カテゴリと確信度を持つ（根拠のない自信を生成しないというガードレール）", () => {
    STORES.forEach((store) => {
      expect(store.evidence.length).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(store.confidence);
      expect(store.generatedAt).not.toBeNull();
    });
  });
});

describe("MAP_RENDERING_MOCK_RESTAURANTS", () => {
  it("地図表示に必要な座標・住所・代表写真・mock placeId を持つ", () => {
    MAP_RENDERING_MOCK_RESTAURANTS.forEach((restaurant, index) => {
      expect(isRestaurant(restaurant)).toBe(true);
      expect(restaurant.location).toEqual({
        lat: expect.any(Number),
        lng: expect.any(Number),
      });
      expect(restaurant.address).toEqual(expect.any(String));
      expect(restaurant.photoUrl).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(restaurant.placeId).toBe(`mock-place-${index + 1}`);
    });
  });
});
