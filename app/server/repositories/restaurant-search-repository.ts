import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRestaurant, type Restaurant } from "~/domain/models/restaurant";
import {
  searchBaseRestaurants,
  searchRestaurants,
  type RestaurantSearchPagination,
  type RestaurantSearchResult,
} from "~/server/services/restaurant-search";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";

// docs/ARCHITECTURE.md「mock mode の API モック」: `/api/restaurants/search` の
// resource route は MODE を意識せず、この repository を呼ぶだけにする。
// mock/real の切り替えは getRestaurantSearchRepository に閉じ込める。
export type RestaurantSearchRepository = {
  search(
    condition: RestaurantSearchQueryCondition,
    pagination: RestaurantSearchPagination,
  ): Promise<RestaurantSearchResult>;
  searchBase(
    condition: RestaurantSearchQueryCondition,
    pagination: RestaurantSearchPagination,
  ): Promise<RestaurantSearchResult>;
};

export const realRestaurantSearchRepository: RestaurantSearchRepository = {
  search: searchRestaurants,
  searchBase: searchBaseRestaurants,
};

// 実際に `/api/restaurants/search` を1回叩いた結果をディスク上の JSON として保存し、
// mock mode はそれをビルド時に import せずファイル読み込みで返す（API モック）。
// この JSON は .gitignore 対象のため、生成前のクローンではファイルが存在しない。
// その場合は例外を投げずに空配列へフォールバックする。
export const MOCK_RESTAURANTS_FIXTURE_PATH = join(
  process.cwd(),
  "app/mocks/fixtures/restaurants-search.json",
);

export type ReadFixtureFile = (path: string) => string;

const defaultReadFile: ReadFixtureFile = (path) => readFileSync(path, "utf-8");

export function loadMockRestaurants(
  readFile: ReadFixtureFile = defaultReadFile,
): Restaurant[] {
  let raw: string;
  try {
    raw = readFile(MOCK_RESTAURANTS_FIXTURE_PATH);
  } catch (error) {
    console.warn("[restaurant-search-mock] fixture-read-failed", {
      path: MOCK_RESTAURANTS_FIXTURE_PATH,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn("[restaurant-search-mock] fixture-json-invalid", {
      path: MOCK_RESTAURANTS_FIXTURE_PATH,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn("[restaurant-search-mock] fixture-not-array", {
      path: MOCK_RESTAURANTS_FIXTURE_PATH,
    });
    return [];
  }
  const restaurants = parsed.filter(isRestaurant);
  if (restaurants.length === 0) {
    console.warn("[restaurant-search-mock] fixture-empty", {
      path: MOCK_RESTAURANTS_FIXTURE_PATH,
      rawCount: parsed.length,
    });
  }
  return restaurants;
}

type MockRestaurantSearchRepositoryOptions = {
  loadRestaurants?: () => Restaurant[];
  // 実 API の待ち時間を模した遅延。テストでは 0 を渡して待たない。
  delayMs?: number;
};

export function createMockRestaurantSearchRepository(
  options: MockRestaurantSearchRepositoryOptions = {},
): RestaurantSearchRepository {
  const loadRestaurants = options.loadRestaurants ?? loadMockRestaurants;
  const delayMs = options.delayMs ?? 1000;

  return {
    async searchBase(_condition, pagination) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const limit = pagination.limit ?? 10;
      const offset = pagination.offset ?? 0;
      const all = loadRestaurants();
      const restaurants = all.slice(offset, offset + limit).map((restaurant) => ({
        ...restaurant,
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
      }));
      const hasMore = offset + restaurants.length < all.length;
      console.info("[restaurant-search-base-mock] complete", {
        total: all.length,
        returned: restaurants.length,
        limit,
        offset,
        hasMore,
      });

      return {
        restaurants,
        fromCache: false,
        hasMore,
        nextOffset: hasMore ? offset + restaurants.length : null,
      };
    },
    async search(_condition, pagination) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const limit = pagination.limit ?? 10;
      const offset = pagination.offset ?? 0;
      const all = loadRestaurants();
      const restaurants = all.slice(offset, offset + limit);
      const hasMore = offset + restaurants.length < all.length;
      console.info("[restaurant-search-mock] complete", {
        total: all.length,
        returned: restaurants.length,
        limit,
        offset,
        hasMore,
      });

      return {
        restaurants,
        fromCache: false,
        hasMore,
        nextOffset: hasMore ? offset + restaurants.length : null,
      };
    },
  };
}

export const mockRestaurantSearchRepository: RestaurantSearchRepository =
  createMockRestaurantSearchRepository();

export function getRestaurantSearchRepository(): RestaurantSearchRepository {
  return process.env.MODE === "mock"
    ? mockRestaurantSearchRepository
    : realRestaurantSearchRepository;
}
