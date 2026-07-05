import type { ActionFunctionArgs } from "react-router";
import { getRestaurantSearchRepository } from "~/server/repositories/restaurant-search-repository";
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
// mock/real の切り替えは意識せず、repository（getRestaurantSearchRepository）に委譲する。
export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as RestaurantSearchRequest;
  const { limit: rawLimit, offset: rawOffset, ...condition } = body;
  const limit = Math.max(1, Math.min(parsePageValue(rawLimit, 10), 20));
  const offset = Math.max(0, parsePageValue(rawOffset, 0));

  const repository = getRestaurantSearchRepository();
  const result = await repository.search(condition, { limit, offset });
  return Response.json(result);
}
