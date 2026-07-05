import { describe, expect, it } from "vitest";
import { STORES } from "./data";

describe("STORES の懸念タグ・推奨理由", () => {
  it("すべての店舗が concernTags 配列を持つ（空配列可）", () => {
    STORES.forEach((store) => {
      expect(Array.isArray(store.concernTags)).toBe(true);
    });
  });

  it("すべての店舗が空でない recommendationReason を持つ", () => {
    STORES.forEach((store) => {
      expect(typeof store.recommendationReason).toBe("string");
      expect(store.recommendationReason.length).toBeGreaterThan(0);
    });
  });
});
