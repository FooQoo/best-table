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

function summarizeSearchRequest(condition: RestaurantSearchQueryCondition) {
  return {
    areas: condition.selectedAreas,
    date: condition.date,
    time: condition.time,
    people: condition.people,
    budget:
      condition.budgetOtherOn && condition.budgetOtherText.trim()
        ? "custom"
        : `${condition.budgetMin}-${condition.budgetMax}`,
    priorities: condition.priorities,
    priorityOtherOn: condition.priorityOtherOn,
    counterpart: condition.counterpart,
  };
}

function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

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
  const limit = Math.max(1, Math.min(parsePageValue(rawLimit, 10), 20));
  const offset = Math.max(0, parsePageValue(rawOffset, 0));
  const startedAt = performance.now();
  console.info("[restaurants-search-route] start", {
    mode: process.env.MODE ?? "unset",
    condition: summarizeSearchRequest(condition),
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
