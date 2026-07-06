import { afterEach, describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import {
  createMockRestaurantSearchRepository,
  getRestaurantSearchRepository,
  loadMockRestaurants,
  mockRestaurantSearchRepository,
  realRestaurantSearchRepository,
} from "./restaurant-search-repository";

const condition = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "指定なし",
  budgetMax: "指定なし",
  budgetOtherOn: false,
  budgetOtherText: "",
  priorities: [],
  priorityOtherOn: false,
  priorityOtherText: "",
  counterpart: null,
  counterpartOtherText: "",
};

function buildRestaurant(id: string): Restaurant {
  return {
    id,
    placeId: null,
    name: id,
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
}

describe("loadMockRestaurants", () => {
  it("ファイル読み込みで取得した JSON を Restaurant[] として返す", () => {
    const restaurant = buildRestaurant("places_abc");
    const restaurants = loadMockRestaurants(() => JSON.stringify([restaurant]));
    expect(restaurants).toEqual([restaurant]);
  });

  it("ファイルが存在しない場合（gitignore 対象で未生成の環境）は空配列にフォールバックする", () => {
    const restaurants = loadMockRestaurants(() => {
      throw new Error("ENOENT: no such file");
    });
    expect(restaurants).toEqual([]);
  });

  it("JSON が壊れている場合は空配列にフォールバックする", () => {
    const restaurants = loadMockRestaurants(() => "not valid json");
    expect(restaurants).toEqual([]);
  });

  it("配列でない JSON は空配列にフォールバックする", () => {
    const restaurants = loadMockRestaurants(() => JSON.stringify({ foo: "bar" }));
    expect(restaurants).toEqual([]);
  });

  it("Restaurant の形状を満たさない要素は取り除く", () => {
    const restaurant = buildRestaurant("places_abc");
    const restaurants = loadMockRestaurants(() =>
      JSON.stringify([restaurant, { id: "" }, "not-an-object"]),
    );
    expect(restaurants).toEqual([restaurant]);
  });
});

describe("createMockRestaurantSearchRepository", () => {
  it("limit/offset に沿って読み込んだ固定データをページングする", async () => {
    const restaurants = [buildRestaurant("a"), buildRestaurant("b"), buildRestaurant("c")];
    const repository = createMockRestaurantSearchRepository({
      loadRestaurants: () => restaurants,
      delayMs: 0,
    });

    const result = await repository.search(condition, { limit: 2, offset: 0 });

    expect(result).toEqual({
      restaurants: restaurants.slice(0, 2),
      fromCache: false,
      hasMore: true,
      nextOffset: 2,
    });
  });

  it("最後のページでは hasMore が false・nextOffset が null になる", async () => {
    const restaurants = [buildRestaurant("a"), buildRestaurant("b")];
    const repository = createMockRestaurantSearchRepository({
      loadRestaurants: () => restaurants,
      delayMs: 0,
    });

    const result = await repository.search(condition, { limit: 10, offset: 0 });

    expect(result.hasMore).toBe(false);
    expect(result.nextOffset).toBeNull();
  });

  it("limit/offset 省略時は先頭10件を返す", async () => {
    const restaurants = Array.from({ length: 15 }, (_, i) => buildRestaurant(`r${i}`));
    const repository = createMockRestaurantSearchRepository({
      loadRestaurants: () => restaurants,
      delayMs: 0,
    });

    const result = await repository.search(condition, {});

    expect(result.restaurants).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });
});

describe("getRestaurantSearchRepository", () => {
  const originalMode = process.env.MODE;

  afterEach(() => {
    process.env.MODE = originalMode;
  });

  it("MODE=mock のとき mockRestaurantSearchRepository を返す", () => {
    process.env.MODE = "mock";
    expect(getRestaurantSearchRepository()).toBe(mockRestaurantSearchRepository);
  });

  it("MODE=mock 以外のとき realRestaurantSearchRepository を返す", () => {
    process.env.MODE = "real";
    expect(getRestaurantSearchRepository()).toBe(realRestaurantSearchRepository);
  });
});
