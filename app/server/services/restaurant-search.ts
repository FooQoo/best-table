import type { Restaurant } from "~/domain/models/restaurant";
import { resolveAreaLatLng } from "~/constants/area-coordinates";
import { buildRestaurantSearchCacheKey } from "~/domain/services/restaurant-cache-policy";
import {
  searchRestaurantCandidates,
  type GroundingCandidate,
} from "~/server/clients/gemini-grounding";
import { evaluateRestaurantCandidates } from "~/server/clients/gemini-evaluation";
import {
  buildPlacePhotoMediaUrl,
  fetchPlaceDetails,
} from "~/server/clients/google-places";
import {
  getCachedRestaurants,
  setCachedRestaurants,
} from "~/server/repositories/restaurant-cache";
import {
  buildGroundingPrompt,
  type RestaurantSearchQueryCondition,
} from "./restaurant-search-query";

// docs/ARCHITECTURE.md「検索・評価型」のユースケース単位のオーケストレーション。
// キャッシュ確認 → グラウンディング → 構造化評価の順に直列実行し、結果をまとめて返す。
export type RestaurantSearchResult = {
  restaurants: Restaurant[];
  fromCache: boolean;
};

export type RestaurantSearchDeps = {
  searchCandidates: typeof searchRestaurantCandidates;
  evaluateCandidates: typeof evaluateRestaurantCandidates;
  resolvePlaceDetails: typeof fetchPlaceDetails;
  getCached: typeof getCachedRestaurants;
  setCached: typeof setCachedRestaurants;
};

const defaultDeps: RestaurantSearchDeps = {
  searchCandidates: searchRestaurantCandidates,
  evaluateCandidates: evaluateRestaurantCandidates,
  resolvePlaceDetails: fetchPlaceDetails,
  getCached: getCachedRestaurants,
  setCached: setCachedRestaurants,
};

// placeId（例: "places/ChIJ..."）をそのまま id にすると "/" が `/stores/:storeId` の
// URL 区切りと衝突するため、URL に安全な形へ変換する。
export function buildRestaurantId(
  placeId: string | null,
  cacheKey: string,
  index: number,
): string {
  if (!placeId) return `${cacheKey}-${index}`;
  return placeId.replace(/\//g, "_");
}

function buildEvaluationPrompt(
  condition: RestaurantSearchQueryCondition,
  candidates: GroundingCandidate[],
): string {
  const names = candidates.map((c) => `「${c.name}」`).join("、");
  return [
    buildGroundingPrompt(condition),
    "",
    `以下の候補について、上記の会食条件への適性を評価してください。候補: ${names}`,
    "根拠が不足する項目は null または空配列にし、確認できない事実を作らないでください。",
  ].join("\n");
}

export async function searchRestaurants(
  condition: RestaurantSearchQueryCondition,
  deps: RestaurantSearchDeps = defaultDeps,
): Promise<RestaurantSearchResult> {
  const cacheKey = buildRestaurantSearchCacheKey(condition);
  const cached = deps.getCached(cacheKey);
  if (cached) {
    return { restaurants: cached, fromCache: true };
  }

  const latLng = resolveAreaLatLng(condition.selectedAreas);
  if (!latLng) {
    return { restaurants: [], fromCache: false };
  }

  const candidates = await deps.searchCandidates({
    prompt: buildGroundingPrompt(condition),
    latLng,
  });
  if (candidates.length === 0) {
    return { restaurants: [], fromCache: false };
  }

  const evaluations = await deps.evaluateCandidates({
    prompt: buildEvaluationPrompt(condition, candidates),
  });
  const evaluationByName = new Map(
    evaluations.map((evaluation) => [evaluation.candidateName, evaluation]),
  );
  const placeDetails = await Promise.all(
    candidates.slice(0, 10).map((candidate) => deps.resolvePlaceDetails(candidate.placeId)),
  );

  const generatedAt = new Date().toISOString();
  const restaurants: Restaurant[] = candidates.map((candidate, index) => {
    const evaluation = evaluationByName.get(candidate.name) ?? null;
    const detail = index < placeDetails.length ? placeDetails[index] : null;
    return {
      // placeId は "places/ChIJ..." のように "/" を含むことがあり、そのまま id に使うと
      // `/stores/:storeId` のルーティングが崩れるため、URL に使える形に変換する。
      id: buildRestaurantId(candidate.placeId, cacheKey, index),
      placeId: candidate.placeId,
      name: candidate.name,
      genre: null,
      area: condition.selectedAreas[0] ?? "",
      address: detail?.address ?? candidate.address,
      location: detail?.location ?? null,
      phone: null,
      photoUrl: detail?.photoName ? buildPlacePhotoMediaUrl(detail.photoName) : null,
      score: evaluation?.score ?? null,
      room: evaluation?.room ?? null,
      quiet: evaluation?.quiet ?? null,
      prestige: evaluation?.prestige ?? null,
      service: evaluation?.service ?? null,
      access: null,
      budgetLabel: evaluation?.budgetLabel ?? null,
      concerns: evaluation?.concerns ?? [],
      matchingSummary: evaluation?.matchingSummary ?? null,
      evidence: evaluation?.evidence ?? [],
      confidence: evaluation?.confidence ?? null,
      generatedAt: evaluation ? generatedAt : null,
    };
  });

  deps.setCached(cacheKey, restaurants);
  return { restaurants, fromCache: false };
}
