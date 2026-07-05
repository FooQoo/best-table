import { describe, expect, it, vi } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { searchRestaurants, type RestaurantSearchDeps } from "./restaurant-search";

const condition = {
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

const unknownAreaCondition = { ...condition, selectedAreas: ["未知のエリア"] };

function buildDeps(overrides: Partial<RestaurantSearchDeps> = {}): RestaurantSearchDeps {
  const cache = new Map<string, Restaurant[]>();
  return {
    searchCandidates: vi.fn(async () => []),
    evaluateCandidates: vi.fn(async () => []),
    resolvePlaceDetails: vi.fn(async () => null),
    getCached: (key) => cache.get(key) ?? null,
    setCached: (key, restaurants) => {
      cache.set(key, restaurants);
    },
    ...overrides,
  };
}

describe("searchRestaurants", () => {
  it("returns an empty result without calling the AI when the area has no known coordinates", async () => {
    const deps = buildDeps();
    const result = await searchRestaurants(unknownAreaCondition, {}, deps);
    expect(result).toEqual({
      restaurants: [],
      fromCache: false,
      hasMore: false,
      nextOffset: null,
    });
    expect(deps.searchCandidates).not.toHaveBeenCalled();
  });

  it("returns an empty result without calling evaluation when grounding finds no candidates", async () => {
    const deps = buildDeps({ searchCandidates: vi.fn(async () => []) });
    const result = await searchRestaurants(condition, {}, deps);
    expect(result).toEqual({
      restaurants: [],
      fromCache: false,
      hasMore: false,
      nextOffset: null,
    });
    expect(deps.evaluateCandidates).not.toHaveBeenCalled();
  });

  it("merges grounding candidates with their evaluation by matching candidate name", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        { name: "桂", placeId: "places/abc", mapsUri: "https://maps.google.com/?cid=1", address: "東京都中央区銀座5-5-11" },
      ]),
      evaluateCandidates: vi.fn(async () => [
        {
          candidateName: "桂",
          genre: "japanese" as const,
          score: 90,
          room: "個室あり" as const,
          quiet: "◎" as const,
          prestige: "◎" as const,
          service: "◎" as const,
          budgetLabel: "¥20,000",
          concerns: [],
          matchingSummary: "接待に適した候補です。",
          evidence: ["description" as const],
          confidence: "medium" as const,
        },
      ]),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.fromCache).toBe(false);
    expect(result.restaurants).toHaveLength(1);
    expect(result.restaurants[0]).toMatchObject({
      placeId: "places/abc",
      name: "桂",
      genre: "japanese",
      address: "東京都中央区銀座5-5-11",
      location: null,
      photoUrl: null,
      score: 90,
      room: "個室あり",
      matchingSummary: "接待に適した候補です。",
    });
    expect(result.restaurants[0].generatedAt).not.toBeNull();
  });

  it("builds an id without '/' from a placeId, so /stores/:storeId routing isn't broken", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        { name: "桂", placeId: "places/ChIJabc123", mapsUri: null, address: null },
      ]),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants[0].id).not.toContain("/");
  });

  it("keeps a candidate with null AI fields when no matching evaluation is returned, instead of dropping it", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        { name: "評価未取得の店", placeId: "places/xyz", mapsUri: null, address: null },
      ]),
      evaluateCandidates: vi.fn(async () => []),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants).toHaveLength(1);
    expect(result.restaurants[0]).toMatchObject({
      name: "評価未取得の店",
      score: null,
      matchingSummary: null,
      concerns: [],
    });
  });

  it("returns cached restaurants without calling the AI again for the same condition", async () => {
    const deps = buildDeps();
    const cachedRestaurant: Restaurant = {
      id: "cached-1",
      placeId: null,
      name: "キャッシュ済み店",
      genre: null,
      area: "銀座",
      address: null,
      location: null,
      phone: null,
      photoUrl: null,
      score: 70,
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
      generatedAt: new Date().toISOString(),
    };
    deps.setCached(
      "銀座|2026-07-15|19:00|4|指定なし|指定なし|room|exec|limit=10|offset=0",
      [cachedRestaurant],
    );

    const result = await searchRestaurants(condition, {}, deps);

    expect(result).toEqual({
      restaurants: [cachedRestaurant],
      fromCache: true,
      hasMore: false,
      nextOffset: null,
    });
    expect(deps.searchCandidates).not.toHaveBeenCalled();
    expect(deps.evaluateCandidates).not.toHaveBeenCalled();
  });

  it("resolves Place Details for the requested 10 candidate page and merges address, location, and photo URL", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      mapsUri: null,
      address: null,
    }));
    const resolvePlaceDetails = vi.fn(async (placeId: string | null) => {
      if (placeId === "places/place-1") {
        return {
          location: { lat: 35.6717, lng: 139.7639 },
          address: "東京都中央区銀座1-1-1",
          shortAddress: "銀座1-1-1",
          photoName: "places/place-1/photos/photo-1",
        };
      }
      return null;
    });
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => candidates),
      resolvePlaceDetails,
    });

    const result = await searchRestaurants(condition, { limit: 10, offset: 0 }, deps);

    expect(resolvePlaceDetails).toHaveBeenCalledTimes(10);
    expect(resolvePlaceDetails).not.toHaveBeenCalledWith("places/place-11");
    expect(result.restaurants).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(10);
    expect(result.restaurants[0]).toMatchObject({
      address: "東京都中央区銀座1-1-1",
      location: { lat: 35.6717, lng: 139.7639 },
      photoUrl: "/api/photos/places/place-1/photos/photo-1",
    });
    expect(result.restaurants[1]).toMatchObject({
      name: "候補2",
      location: null,
      photoUrl: null,
    });
  });

  it("returns the next page from limit and offset without replacing it with the first page", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      mapsUri: null,
      address: null,
    }));
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => candidates),
    });

    const result = await searchRestaurants(condition, { limit: 10, offset: 10 }, deps);

    expect(result.restaurants.map((restaurant) => restaurant.name)).toEqual([
      "候補11",
      "候補12",
    ]);
    expect(result.hasMore).toBe(false);
    expect(result.nextOffset).toBeNull();
  });

  it("keeps the grounding address when Place Details cannot resolve a candidate", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "住所だけ分かる店",
          placeId: "places/address-only",
          mapsUri: null,
          address: "東京都中央区銀座2-2-2",
        },
      ]),
      resolvePlaceDetails: vi.fn(async () => null),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants[0]).toMatchObject({
      address: "東京都中央区銀座2-2-2",
      location: null,
      photoUrl: null,
    });
  });
});
