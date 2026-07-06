import type { GroundingCandidate } from "~/server/clients/gemini-grounding";
import { isRestaurantCacheFresh } from "~/domain/services/restaurant-cache-policy";

// app/server/repositories/restaurant-cache.ts が評価済み Restaurant[] を保存するのに対し、
// こちらはグラウンディング候補（GroundingCandidate[]）を limit/offset を含まないキーで保存する。
// 「もっと読み込む」の度にグラウンディングを再実行すると、Gemini の非決定的な応答により
// 候補の順序・内容がページ間でずれる（重複・欠落）ため、1回の検索条件につき候補一覧を
// 使い回せるようにする。プロトタイプのためプロセス内メモリのみで永続化はしない。
type CandidateCacheEntry = {
  candidates: GroundingCandidate[];
  generatedAt: string;
};

const cache = new Map<string, CandidateCacheEntry>();

export function getCachedCandidates(key: string): GroundingCandidate[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (!isRestaurantCacheFresh(entry.generatedAt, new Date())) {
    cache.delete(key);
    return null;
  }
  return entry.candidates;
}

export function setCachedCandidates(
  key: string,
  candidates: GroundingCandidate[],
): void {
  cache.set(key, { candidates, generatedAt: new Date().toISOString() });
}

export function __resetRestaurantCandidateCacheForTest(): void {
  cache.clear();
}
