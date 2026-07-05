import { describe, expect, it } from "vitest";
import {
  buildRestaurantSearchCacheKey,
  isRestaurantCacheFresh,
  RESTAURANT_CACHE_TTL_MS,
} from "./restaurant-cache-policy";

const baseCondition = {
  selectedAreas: ["銀座", "六本木"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "指定なし",
  budgetMax: "指定なし",
  priorities: ["room", "access"],
  counterpart: "exec",
};

describe("buildRestaurantSearchCacheKey", () => {
  it("同一条件では同じキーになる", () => {
    expect(buildRestaurantSearchCacheKey(baseCondition)).toBe(
      buildRestaurantSearchCacheKey({ ...baseCondition }),
    );
  });

  it("エリア・重視条件の選択順序が違っても同じキーになる", () => {
    const reordered = {
      ...baseCondition,
      selectedAreas: ["六本木", "銀座"],
      priorities: ["access", "room"],
    };
    expect(buildRestaurantSearchCacheKey(baseCondition)).toBe(
      buildRestaurantSearchCacheKey(reordered),
    );
  });

  it("相手種別が異なると別のキーになる（AI評価が相手種別に依存するため）", () => {
    const other = { ...baseCondition, counterpart: "partner" };
    expect(buildRestaurantSearchCacheKey(baseCondition)).not.toBe(
      buildRestaurantSearchCacheKey(other),
    );
  });

  it("相手種別が未選択でもキーを生成できる", () => {
    const noCounterpart = { ...baseCondition, counterpart: null };
    expect(() => buildRestaurantSearchCacheKey(noCounterpart)).not.toThrow();
  });

  it("エリア・日時・人数のいずれかが異なると別のキーになる", () => {
    const otherPeople = { ...baseCondition, people: 6 };
    expect(buildRestaurantSearchCacheKey(baseCondition)).not.toBe(
      buildRestaurantSearchCacheKey(otherPeople),
    );
  });
});

describe("isRestaurantCacheFresh", () => {
  it("TTL 内なら新鮮と判定する", () => {
    const now = new Date("2026-07-05T10:00:00.000Z");
    const generatedAt = "2026-07-05T09:50:00.000Z";
    expect(isRestaurantCacheFresh(generatedAt, now)).toBe(true);
  });

  it("TTL を超えていたら新鮮ではないと判定する", () => {
    const now = new Date("2026-07-05T10:00:00.000Z");
    const generatedAt = new Date(
      now.getTime() - RESTAURANT_CACHE_TTL_MS - 1,
    ).toISOString();
    expect(isRestaurantCacheFresh(generatedAt, now)).toBe(false);
  });

  it("generatedAt が null（未生成）の場合は新鮮ではないと判定する", () => {
    const now = new Date("2026-07-05T10:00:00.000Z");
    expect(isRestaurantCacheFresh(null, now)).toBe(false);
  });

  it("generatedAt が不正な日時文字列の場合は新鮮ではないと判定する", () => {
    const now = new Date("2026-07-05T10:00:00.000Z");
    expect(isRestaurantCacheFresh("not-a-date", now)).toBe(false);
  });
});
