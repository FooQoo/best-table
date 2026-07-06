import type { ActionFunctionArgs } from "react-router";
import { getRestaurantSearchRepository } from "~/server/repositories/restaurant-search-repository";
import {
  summarizeRestaurantSearchCondition,
  type RestaurantSearchQueryCondition,
} from "~/server/services/restaurant-search-query";
import { parseRestaurantSearchPagination } from "~/server/services/restaurant-search-pagination";
import { summarizeError } from "~/server/utils/summarize-error";

type RestaurantSearchRequest = RestaurantSearchQueryCondition & {
  limit?: number;
  offset?: number;
};

// UI を持たない resource route（docs/ARCHITECTURE.md「検索・評価型」）。
// /results の loader ではなく action 経由にしているのは、検索条件が
// クライアント側の Jotai 状態（booking-context）にしかないため。
// mock/real の切り替えは意識せず、repository（getRestaurantSearchRepository）に委譲する。
export async function action({ request }: ActionFunctionArgs) {
  let body: RestaurantSearchRequest;
  try {
    body = (await request.json()) as RestaurantSearchRequest;
  } catch {
    console.warn("[restaurants-search-route] invalid-json");
    return Response.json({ error: "JSON body is required" }, { status: 400 });
  }

  const { limit: rawLimit, offset: rawOffset, ...condition } = body;
  const { limit, offset } = parseRestaurantSearchPagination({
    limit: rawLimit,
    offset: rawOffset,
  });
  const startedAt = performance.now();
  console.info("[restaurants-search-route] start", {
    mode: process.env.MODE ?? "unset",
    condition: summarizeRestaurantSearchCondition(condition),
    limit,
    offset,
  });

  const repository = getRestaurantSearchRepository();
  try {
    const result = await repository.search(condition, { limit, offset });
    console.info("[restaurants-search-route] complete", {
      count: result.restaurants.length,
      fromCache: result.fromCache,
      hasMore: result.hasMore,
      nextOffset: result.nextOffset,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
    return Response.json(result);
  } catch (error) {
    console.error("[restaurants-search-route] failed", {
      error: summarizeError(error),
      elapsedMs: Math.round(performance.now() - startedAt),
    });
    return Response.json(
      { error: "レストラン検索に失敗しました。" },
      { status: 500 },
    );
  }
}
