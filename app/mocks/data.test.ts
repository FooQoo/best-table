import { describe, expect, it } from "vitest";
import { isRestaurant } from "~/domain/models/restaurant";
import { STORES } from "./data";

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
