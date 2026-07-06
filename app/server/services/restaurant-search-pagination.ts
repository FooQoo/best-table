import type { RestaurantSearchPagination } from "./restaurant-search";

// `/api/restaurants/search` と `/api/restaurants/search/stream` の両 resource route で
// 共通のページングパラメータ解析。limit は 1〜20 件、offset は 0 以上にクランプする。
export function parseRestaurantSearchPagination(body: {
  limit?: unknown;
  offset?: unknown;
  existingRestaurantKeys?: string[];
}): Required<RestaurantSearchPagination> {
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit)
    ? body.limit
    : 10;
  const offset = typeof body.offset === "number" && Number.isFinite(body.offset)
    ? body.offset
    : 0;
  return {
    limit: Math.max(1, Math.min(limit, 20)),
    offset: Math.max(0, offset),
    existingRestaurantKeys: body.existingRestaurantKeys ?? [],
  };
}
