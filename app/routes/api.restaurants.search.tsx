import type { ActionFunctionArgs } from "react-router";
import { MAP_RENDERING_MOCK_RESTAURANTS } from "~/mocks/data";
import { searchRestaurants } from "~/server/services/restaurant-search";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";

type RestaurantSearchRequest = RestaurantSearchQueryCondition & {
  limit?: number;
  offset?: number;
};

function parsePageValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// UI を持たない resource route（docs/ARCHITECTURE.md「検索・評価型」）。
// /results の loader ではなく action 経由にしているのは、検索条件が
// クライアント側の Jotai 状態（booking-context）にしかないため。
export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as RestaurantSearchRequest;
  const { limit: rawLimit, offset: rawOffset, ...condition } = body;
  const limit = Math.max(1, Math.min(parsePageValue(rawLimit, 10), 20));
  const offset = Math.max(0, parsePageValue(rawOffset, 0));

  if (process.env.MODE === "mock") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const restaurants = MAP_RENDERING_MOCK_RESTAURANTS.slice(offset, offset + limit);
    const hasMore = offset + restaurants.length < MAP_RENDERING_MOCK_RESTAURANTS.length;
    return Response.json({
      restaurants,
      fromCache: false,
      hasMore,
      nextOffset: hasMore ? offset + restaurants.length : null,
    });
  }

  const result = await searchRestaurants(condition, { limit, offset });
  return Response.json(result);
}
