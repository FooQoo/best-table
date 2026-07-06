import { describe, expect, it, vi } from "vitest";
import {
  searchRestaurants,
  streamRestaurants,
  type RestaurantSearchDeps,
} from "./restaurant-search";

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
  return {
    searchCandidates: vi.fn(async () => []),
    evaluateCandidates: vi.fn(async () => []),
    streamEvaluations: vi.fn(async function* () {}),
    resolvePlaceDetails: vi.fn(async () => null),
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
        {
          name: "桂",
          placeId: "places/abc",
          mapsUri: "https://maps.google.com/?cid=1",
          phone: "03-1234-5678",
          mapsText: "* **Nearby Landmarks & Areas:**\n* Near Ginza Station",
        },
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
          access: "銀座駅周辺",
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
      address: null,
      location: null,
      photoUrl: null,
      score: 90,
      room: "個室あり",
      phone: "03-1234-5678",
      access: "銀座駅周辺",
      matchingSummary: "接待に適した候補です。",
    });
    expect(result.restaurants[0].generatedAt).not.toBeNull();
  });

  it("builds an id without '/' from a placeId, so it is safe to use in URL state", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "桂",
          placeId: "places/ChIJabc123",
          mapsUri: null,
          phone: null,
          mapsText: null,
        },
      ]),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants[0].id).not.toContain("/");
  });

  it("keeps a candidate with null AI fields when no matching evaluation is returned, instead of dropping it", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "評価未取得の店",
          placeId: "places/xyz",
          mapsUri: null,
          phone: null,
          mapsText: null,
        },
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

  it("always keeps the grounding candidate name as-is, without AI-based translation", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "Dominique Bouchet Tokyo",
          placeId: "places/dbt",
          mapsUri: null,
          phone: null,
          mapsText: null,
        },
      ]),
      evaluateCandidates: vi.fn(async () => [
        {
          candidateName: "Dominique Bouchet Tokyo",
          genre: "western" as const,
          score: 95,
          room: "個室あり" as const,
          quiet: "◎" as const,
          prestige: "◎" as const,
          service: "◎" as const,
          access: "銀座駅周辺",
          budgetLabel: "¥30,000",
          concerns: [],
          matchingSummary: "接待向きの候補です。",
          evidence: ["description" as const],
          confidence: "medium" as const,
        },
      ]),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants[0]).toMatchObject({
      placeId: "places/dbt",
      name: "Dominique Bouchet Tokyo",
      score: 95,
    });
  });

  it("resolves Place Details for the requested 10 candidate page and merges address, location, and photo URL", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      mapsUri: null,
      phone: null,
      mapsText: null,
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
      phone: null,
      mapsText: null,
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

  it("evaluates only the requested candidate page to keep structured output small", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      mapsUri: null,
      phone: null,
      mapsText: null,
    }));
    const evaluateCandidates: RestaurantSearchDeps["evaluateCandidates"] = vi.fn(
      async () => [],
    );
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => candidates),
      evaluateCandidates,
    });

    await searchRestaurants(condition, { limit: 10, offset: 10 }, deps);

    expect(evaluateCandidates).toHaveBeenCalledTimes(1);
    const prompt = vi.mocked(evaluateCandidates).mock.calls[0][0].prompt;
    expect(prompt).toContain("1. 候補11");
    expect(prompt).toContain("2. 候補12");
    expect(prompt).not.toContain("候補10");
  });

  it("leaves address null when Place Details cannot resolve a candidate", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "住所未解決の店",
          placeId: "places/address-unresolved",
          mapsUri: null,
          phone: null,
          mapsText: null,
        },
      ]),
      resolvePlaceDetails: vi.fn(async () => null),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants[0]).toMatchObject({
      address: null,
      location: null,
      photoUrl: null,
    });
  });

  it("streams restaurants as evaluation elements become available", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "逐次返却の店",
          placeId: "places/stream",
          mapsUri: null,
          phone: null,
          mapsText: null,
        },
      ]),
      streamEvaluations: vi.fn(async function* () {
        yield {
          candidateName: "逐次返却の店",
          genre: "japanese" as const,
          score: 88,
          room: "個室あり" as const,
          quiet: "◎" as const,
          prestige: "○" as const,
          service: "◎" as const,
          access: "銀座駅周辺",
          budgetLabel: "¥20,000",
          concerns: [],
          matchingSummary: "接待に使いやすい候補です。",
          evidence: ["description" as const],
          confidence: "medium" as const,
        };
      }),
    });

    const events = [];
    for await (const event of streamRestaurants(condition, {}, deps)) {
      events.push(event);
    }

    expect(events[0]).toEqual({ type: "phase", phase: "grounding" });
    expect(events[1]).toEqual({ type: "phase", phase: "evaluating" });
    expect(events[2]).toMatchObject({
      type: "restaurant",
      restaurant: {
        name: "逐次返却の店",
        score: 88,
        matchingSummary: "接待に使いやすい候補です。",
      },
    });
    expect(events.at(-1)).toMatchObject({
      type: "done",
      fromCache: false,
      hasMore: false,
      nextOffset: null,
    });
  });

  it("emits the grounding phase but not the evaluating phase when the area cannot be resolved", async () => {
    const events = [];
    for await (const event of streamRestaurants(unknownAreaCondition, {}, buildDeps())) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "phase", phase: "grounding" },
      { type: "done", fromCache: false, hasMore: false, nextOffset: null },
    ]);
  });

  it("emits the grounding phase but not the evaluating phase when there are no candidates", async () => {
    const deps = buildDeps({ searchCandidates: vi.fn(async () => []) });

    const events = [];
    for await (const event of streamRestaurants(condition, {}, deps)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "phase", phase: "grounding" },
      { type: "done", fromCache: false, hasMore: false, nextOffset: null },
    ]);
  });

  it("re-runs grounding for a later page (no candidate cache)", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      mapsUri: null,
      phone: null,
      mapsText: null,
    }));
    const searchCandidates = vi.fn(async () => candidates);
    const deps = buildDeps({ searchCandidates });

    const first = await searchRestaurants(condition, { limit: 10, offset: 0 }, deps);
    const second = await searchRestaurants(condition, { limit: 10, offset: 10 }, deps);

    expect(searchCandidates).toHaveBeenCalledTimes(2);
    expect(first.restaurants.map((r) => r.name)).toEqual(
      candidates.slice(0, 10).map((c) => c.name),
    );
    expect(second.restaurants.map((r) => r.name)).toEqual(
      candidates.slice(10, 12).map((c) => c.name),
    );
  });
});
