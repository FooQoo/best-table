import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { RESTAURANT_CACHE_TTL_MS } from "~/domain/services/restaurant-cache-policy";
import { __resetRestaurantCacheForTest, getCachedRestaurants, setCachedRestaurants } from "./restaurant-cache";

const restaurant: Restaurant = {
  id: "s1",
  placeId: null,
  name: "テスト店",
  genre: null,
  area: "銀座",
  address: null,
  location: null,
  phone: null,
  photoUrl: null,
  score: 80,
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

beforeEach(() => {
  __resetRestaurantCacheForTest();
});

describe("restaurant-cache repository", () => {
  it("returns null for a key that has never been set", () => {
    expect(getCachedRestaurants("missing-key")).toBeNull();
  });

  it("returns the cached restaurants right after they are set", () => {
    setCachedRestaurants("key-1", [restaurant]);
    expect(getCachedRestaurants("key-1")).toEqual([restaurant]);
  });

  it("returns null once the cache entry is older than the TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T10:00:00.000Z"));
    setCachedRestaurants("key-2", [restaurant]);
    vi.setSystemTime(new Date(new Date("2026-07-05T10:00:00.000Z").getTime() + RESTAURANT_CACHE_TTL_MS + 1));
    expect(getCachedRestaurants("key-2")).toBeNull();
    vi.useRealTimers();
  });
});
