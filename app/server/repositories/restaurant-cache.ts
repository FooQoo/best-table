import type { Restaurant } from "~/domain/models/restaurant";
import { isRestaurantCacheFresh } from "~/domain/services/restaurant-cache-policy";

// docs/ARCHITECTURE.md「検索・評価型」: 完成済みの Restaurant[] の保存・取得のみを担当する。
// 外部 API は呼ばない。プロトタイプのためプロセス内メモリのみで永続化はしない。
type CacheEntry = {
  restaurants: Restaurant[];
  generatedAt: string;
};

const cache = new Map<string, CacheEntry>();

export function getCachedRestaurants(key: string): Restaurant[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (!isRestaurantCacheFresh(entry.generatedAt, new Date())) {
    cache.delete(key);
    return null;
  }
  return entry.restaurants;
}

export function setCachedRestaurants(key: string, restaurants: Restaurant[]): void {
  cache.set(key, { restaurants, generatedAt: new Date().toISOString() });
}

export function __resetRestaurantCacheForTest(): void {
  cache.clear();
}
