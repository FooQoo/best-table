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
    const result = await searchRestaurants(unknownAreaCondition, deps);
    expect(result).toEqual({ restaurants: [], fromCache: false });
    expect(deps.searchCandidates).not.toHaveBeenCalled();
  });

  it("returns an empty result without calling evaluation when grounding finds no candidates", async () => {
    const deps = buildDeps({ searchCandidates: vi.fn(async () => []) });
    const result = await searchRestaurants(condition, deps);
    expect(result).toEqual({ restaurants: [], fromCache: false });
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

    const result = await searchRestaurants(condition, deps);

    expect(result.fromCache).toBe(false);
    expect(result.restaurants).toHaveLength(1);
    expect(result.restaurants[0]).toMatchObject({
      placeId: "places/abc",
      name: "桂",
      address: "東京都中央区銀座5-5-11",
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

    const result = await searchRestaurants(condition, deps);

    expect(result.restaurants[0].id).not.toContain("/");
  });

  it("keeps a candidate with null AI fields when no matching evaluation is returned, instead of dropping it", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        { name: "評価未取得の店", placeId: "places/xyz", mapsUri: null, address: null },
      ]),
      evaluateCandidates: vi.fn(async () => []),
    });

    const result = await searchRestaurants(condition, deps);

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
      "銀座|2026-07-15|19:00|4|指定なし|指定なし|room|exec",
      [cachedRestaurant],
    );

    const result = await searchRestaurants(condition, deps);

    expect(result).toEqual({ restaurants: [cachedRestaurant], fromCache: true });
    expect(deps.searchCandidates).not.toHaveBeenCalled();
    expect(deps.evaluateCandidates).not.toHaveBeenCalled();
  });
});
