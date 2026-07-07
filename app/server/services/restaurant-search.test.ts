import { describe, expect, it, vi } from "vitest";
import {
  resolveRestaurantAreaFromAddress,
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
    ...overrides,
  };
}

describe("resolveRestaurantAreaFromAddress", () => {
  it("extracts the neighborhood from a Japanese formatted address", () => {
    expect(resolveRestaurantAreaFromAddress("東京都中央区銀座5-5-11")).toBe(
      "銀座",
    );
    expect(
      resolveRestaurantAreaFromAddress("日本、〒105-0001 東京都港区虎ノ門2丁目6-3"),
    ).toBe("虎ノ門");
    expect(resolveRestaurantAreaFromAddress("大阪府大阪市北区梅田3-1-1")).toBe(
      "梅田",
    );
  });

  it("returns null when the address cannot provide a display area", () => {
    expect(resolveRestaurantAreaFromAddress(null)).toBeNull();
    expect(resolveRestaurantAreaFromAddress("東京都中央区")).toBeNull();
  });
});

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

  it("returns an empty result without calling evaluation when the place search finds no candidates", async () => {
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

  it("merges search candidates with their evaluation by matching candidateIndex", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "桂",
          placeId: "places/abc",
          address: "東京都中央区銀座5-5-11",
          location: { lat: 35.6717, lng: 139.7639 },
          phone: "03-1234-5678",
          photoName: "places/abc/photos/photo-1",
          genre: "japanese" as const,
        },
      ]),
      evaluateCandidates: vi.fn(async () => [
        {
          candidateIndex: 1,
          candidateName: "桂",
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
      area: "銀座",
      address: "東京都中央区銀座5-5-11",
      location: { lat: 35.6717, lng: 139.7639 },
      photoUrl: "/api/photos/places/abc/photos/photo-1",
      matchTier: "highest",
      room: "個室あり",
      phone: "03-1234-5678",
      access: "銀座駅周辺",
      matchingSummary: "接待に適した候補です。",
    });
    expect(result.restaurants[0].generatedAt).not.toBeNull();
  });

  it("uses the Places formattedAddress to populate the card display area", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "丸の内の店",
          placeId: "places/marunouchi",
          address: "東京都千代田区丸の内1-1-1",
          location: null,
          phone: null,
          photoName: null,
          genre: "japanese" as const,
        },
      ]),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants[0]).toMatchObject({
      name: "丸の内の店",
      area: "丸の内",
    });
  });

  it("falls back to the selected search area when the Places address has no display area", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "住所不明の店",
          placeId: "places/no-address",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
      ]),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants[0]).toMatchObject({
      name: "住所不明の店",
      area: "銀座",
    });
  });

  it("distinguishes candidates that share the same name by their candidateIndex, not by name", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "串焼き 大将",
          placeId: "places/branch-1",
          address: "東京都中央区銀座1-1-1",
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
        {
          name: "串焼き 大将",
          placeId: "places/branch-2",
          address: "東京都中央区銀座2-2-2",
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
      ]),
      evaluateCandidates: vi.fn(async () => [
        {
          candidateIndex: 1,
          candidateName: "串焼き 大将",
          room: "個室あり" as const,
          quiet: "◎" as const,
          prestige: "○" as const,
          service: "◎" as const,
          access: null,
          budgetLabel: null,
          concerns: [],
          matchingSummary: "1号店です。",
          evidence: [],
          confidence: "medium" as const,
        },
        {
          candidateIndex: 2,
          candidateName: "串焼き 大将",
          room: "個室なし" as const,
          quiet: "△" as const,
          prestige: "△" as const,
          service: "○" as const,
          access: null,
          budgetLabel: null,
          concerns: [],
          matchingSummary: "2号店です。",
          evidence: [],
          confidence: "medium" as const,
        },
      ]),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants).toHaveLength(2);
    expect(result.restaurants[0]).toMatchObject({
      placeId: "places/branch-1",
      matchingSummary: "1号店です。",
    });
    expect(result.restaurants[1]).toMatchObject({
      placeId: "places/branch-2",
      matchingSummary: "2号店です。",
    });
  });

  it("builds an id without '/' from a placeId, so it is safe to use in URL state", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "桂",
          placeId: "places/ChIJabc123",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
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
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
      ]),
      evaluateCandidates: vi.fn(async () => []),
    });

    const result = await searchRestaurants(condition, {}, deps);

    expect(result.restaurants).toHaveLength(1);
    expect(result.restaurants[0]).toMatchObject({
      name: "評価未取得の店",
      matchTier: null,
      matchingSummary: null,
      concerns: [],
    });
  });

  it("keeps the search candidate name as-is even when the AI echoes a different candidateName", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "Dominique Bouchet Tokyo",
          placeId: "places/dbt",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: "western" as const,
        },
      ]),
      evaluateCandidates: vi.fn(async () => [
        {
          candidateIndex: 1,
          candidateName: "Dominique Bouchet",
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
      matchTier: "highest",
    });
  });

  it("takes address, location, photo URL, and genre directly from the Text Search candidate (no separate Place Details call)", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      address: index === 0 ? "東京都中央区銀座1-1-1" : null,
      location: index === 0 ? { lat: 35.6717, lng: 139.7639 } : null,
      phone: null,
      photoName: index === 0 ? "places/place-1/photos/photo-1" : null,
      genre: index === 0 ? ("japanese" as const) : null,
    }));
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => candidates),
    });

    const result = await searchRestaurants(condition, { limit: 10, offset: 0 }, deps);

    expect(result.restaurants).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(10);
    expect(result.restaurants[0]).toMatchObject({
      address: "東京都中央区銀座1-1-1",
      location: { lat: 35.6717, lng: 139.7639 },
      photoUrl: "/api/photos/places/place-1/photos/photo-1",
      genre: "japanese",
    });
    expect(result.restaurants[1]).toMatchObject({
      name: "候補2",
      address: null,
      location: null,
      photoUrl: null,
      genre: null,
    });
  });

  it("returns the next page from limit and offset without replacing it with the first page", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      address: null,
      location: null,
      phone: null,
      photoName: null,
      genre: null,
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

  it("requests exactly offset + limit candidates from the place search, so pagination stays within a single deterministic call", async () => {
    const searchCandidates = vi.fn(async () => []);
    const deps = buildDeps({ searchCandidates });

    await searchRestaurants(condition, { limit: 10, offset: 10 }, deps);

    expect(searchCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 20 }),
    );
  });

  it("evaluates only the requested candidate page to keep structured output small", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      address: null,
      location: null,
      phone: null,
      photoName: null,
      genre: null,
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

  it("grounds the AI evaluation prompt only in the store name and booking condition, not Places-sourced address/phone", async () => {
    const evaluateCandidates: RestaurantSearchDeps["evaluateCandidates"] = vi.fn(
      async () => [],
    );
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "桂",
          placeId: "places/abc",
          address: "東京都中央区銀座5-5-11",
          location: null,
          phone: "03-1234-5678",
          photoName: null,
          genre: null,
        },
      ]),
      evaluateCandidates,
    });

    await searchRestaurants(condition, {}, deps);

    const prompt = vi.mocked(evaluateCandidates).mock.calls[0][0].prompt;
    expect(prompt).toContain("1. 桂");
    expect(prompt).not.toContain("東京都中央区銀座5-5-11");
    expect(prompt).not.toContain("03-1234-5678");
  });

  it("emits the base restaurant immediately after search, before AI evaluation starts", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "逐次返却の店",
          placeId: "places/stream",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: "japanese" as const,
        },
      ]),
      streamEvaluations: vi.fn(async function* () {
        yield {
          candidateIndex: 1,
          candidateName: "逐次返却の店",
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

    expect(events[0]).toEqual({ type: "phase", phase: "searching" });
    expect(events[1]).toMatchObject({
      type: "restaurant",
      restaurant: {
        name: "逐次返却の店",
        genre: "japanese",
        matchTier: null,
        matchingSummary: null,
      },
    });
    expect(events[2]).toEqual({ type: "phase", phase: "evaluating" });
    expect(events[3]).toMatchObject({
      type: "restaurant-evaluated",
      restaurant: {
        name: "逐次返却の店",
        matchTier: "highest",
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

  it("keeps a candidate at its base state (single event) when its evaluation never arrives", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "評価が届く店",
          placeId: "places/evaluated",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
        {
          name: "評価が届かない店",
          placeId: "places/straggler",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
      ]),
      streamEvaluations: vi.fn(async function* () {
        yield {
          candidateIndex: 1,
          candidateName: "評価が届く店",
          room: "個室あり" as const,
          quiet: "◎" as const,
          prestige: "◎" as const,
          service: "◎" as const,
          access: "銀座駅周辺",
          budgetLabel: "¥20,000",
          concerns: [],
          matchingSummary: "評価済みです。",
          evidence: ["description" as const],
          confidence: "medium" as const,
        };
      }),
    });

    const events = [];
    for await (const event of streamRestaurants(condition, {}, deps)) {
      events.push(event);
    }

    const evaluatedEvents = events.filter((e) => e.type === "restaurant-evaluated");
    expect(evaluatedEvents).toHaveLength(1);
    expect(evaluatedEvents[0]).toMatchObject({
      restaurant: { name: "評価が届く店", matchingSummary: "評価済みです。" },
    });

    const strugglerRestaurantEvents = events.filter(
      (e) => e.type === "restaurant" && e.restaurant.name === "評価が届かない店",
    );
    expect(strugglerRestaurantEvents).toHaveLength(1);
    expect(strugglerRestaurantEvents[0]).toMatchObject({
      restaurant: { name: "評価が届かない店", matchTier: null, matchingSummary: null },
    });
  });

  it("distinguishes streamed evaluations for candidates that share the same name by their candidateIndex", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "串焼き 大将",
          placeId: "places/branch-1",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
        {
          name: "串焼き 大将",
          placeId: "places/branch-2",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
      ]),
      streamEvaluations: vi.fn(async function* () {
        yield {
          candidateIndex: 1,
          candidateName: "串焼き 大将",
          room: "個室あり" as const,
          quiet: "◎" as const,
          prestige: "○" as const,
          service: "◎" as const,
          access: null,
          budgetLabel: null,
          concerns: [],
          matchingSummary: "1号店です。",
          evidence: [],
          confidence: "medium" as const,
        };
        yield {
          candidateIndex: 2,
          candidateName: "串焼き 大将",
          room: "個室なし" as const,
          quiet: "△" as const,
          prestige: "△" as const,
          service: "○" as const,
          access: null,
          budgetLabel: null,
          concerns: [],
          matchingSummary: "2号店です。",
          evidence: [],
          confidence: "medium" as const,
        };
      }),
    });

    const events = [];
    for await (const event of streamRestaurants(condition, {}, deps)) {
      events.push(event);
    }

    const evaluatedEvents = events.filter((e) => e.type === "restaurant-evaluated");
    expect(evaluatedEvents).toHaveLength(2);
    expect(evaluatedEvents[0]).toMatchObject({
      restaurant: { placeId: "places/branch-1", matchingSummary: "1号店です。" },
    });
    expect(evaluatedEvents[1]).toMatchObject({
      restaurant: { placeId: "places/branch-2", matchingSummary: "2号店です。" },
    });
  });

  it("emits an error event but keeps the already-sent base restaurants when the evaluation stream fails entirely", async () => {
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "評価に失敗する店",
          placeId: "places/failing",
          address: null,
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
      ]),
      streamEvaluations: vi.fn(async function* () {
        throw new Error("quota exceeded");
        // eslint-disable-next-line no-unreachable
        yield {} as never;
      }),
    });

    const events = [];
    for await (const event of streamRestaurants(condition, {}, deps)) {
      events.push(event);
    }

    expect(
      events.some((event) => event.type === "restaurant" && event.restaurant.name === "評価に失敗する店"),
    ).toBe(true);
    expect(events.some((event) => event.type === "error")).toBe(true);
    expect(events.at(-1)).toMatchObject({
      type: "done",
      hasMore: false,
      nextOffset: null,
    });
  });

  it("excludes already displayed restaurants before streaming AI evaluation", async () => {
    const streamEvaluations = vi.fn(async function* (input: { prompt: string }) {
      expect(input.prompt).not.toContain("既存の店");
      expect(input.prompt).toContain("追加の店");
      yield {
        candidateIndex: 1,
        candidateName: "追加の店",
        room: "個室あり" as const,
        quiet: "◎" as const,
        prestige: "◎" as const,
        service: "◎" as const,
        access: "銀座駅周辺",
        budgetLabel: "¥20,000",
        concerns: [],
        matchingSummary: "追加分だけ評価しています。",
        evidence: ["description" as const],
        confidence: "medium" as const,
      };
    });
    const deps = buildDeps({
      searchCandidates: vi.fn(async () => [
        {
          name: "既存の店",
          placeId: "places/existing",
          address: "東京都中央区銀座1-1-1",
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
        {
          name: "追加の店",
          placeId: "places/new",
          address: "東京都千代田区丸の内1-1-1",
          location: null,
          phone: null,
          photoName: null,
          genre: null,
        },
      ]),
      streamEvaluations,
    });

    const events = [];
    for await (const event of streamRestaurants(
      condition,
      { existingRestaurantKeys: ["place:places/existing"] },
      deps,
    )) {
      events.push(event);
    }

    expect(streamEvaluations).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.type === "restaurant" && event.restaurant.name === "既存の店")).toBe(false);
    expect(events.some((event) => event.type === "restaurant" && event.restaurant.name === "追加の店")).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === "restaurant-evaluated" &&
          event.restaurant.name === "追加の店",
      ),
    ).toBe(true);
  });

  it("emits the searching phase but not the evaluating phase when the area cannot be resolved", async () => {
    const events = [];
    for await (const event of streamRestaurants(unknownAreaCondition, {}, buildDeps())) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "phase", phase: "searching" },
      { type: "done", fromCache: false, hasMore: false, nextOffset: null },
    ]);
  });

  it("emits the searching phase but not the evaluating phase when there are no candidates", async () => {
    const deps = buildDeps({ searchCandidates: vi.fn(async () => []) });

    const events = [];
    for await (const event of streamRestaurants(condition, {}, deps)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "phase", phase: "searching" },
      { type: "done", fromCache: false, hasMore: false, nextOffset: null },
    ]);
  });

  it("re-runs the place search for a later page, relying on Text Search determinism instead of a candidate cache", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      name: `候補${index + 1}`,
      placeId: `places/place-${index + 1}`,
      address: null,
      location: null,
      phone: null,
      photoName: null,
      genre: null,
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
