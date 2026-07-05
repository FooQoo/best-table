import type { ActionFunctionArgs } from "react-router";
import { MAP_RENDERING_MOCK_RESTAURANTS } from "~/mocks/data";
import { searchRestaurants } from "~/server/services/restaurant-search";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";

// UI を持たない resource route（docs/ARCHITECTURE.md「検索・評価型」）。
// /results の loader ではなく action 経由にしているのは、検索条件が
// クライアント側の Jotai 状態（booking-context）にしかないため。
export async function action({ request }: ActionFunctionArgs) {
  const condition = (await request.json()) as RestaurantSearchQueryCondition;
  if (process.env.MODE === "mock") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return Response.json({
      restaurants: MAP_RENDERING_MOCK_RESTAURANTS,
      fromCache: false,
    });
  }

  const result = await searchRestaurants(condition);
  return Response.json(result);
}
