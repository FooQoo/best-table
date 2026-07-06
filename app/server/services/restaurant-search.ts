import type { Restaurant } from "~/domain/models/restaurant";
import { resolveAreaLatLng } from "~/constants/area-coordinates";
import { buildRestaurantSearchCacheKey } from "~/domain/services/restaurant-cache-policy";
import {
  searchRestaurantCandidates,
  type GroundingCandidate,
} from "~/server/clients/gemini-grounding";
import {
  evaluateRestaurantCandidates,
  streamRestaurantEvaluations,
} from "~/server/clients/gemini-evaluation";
import type { RestaurantEvaluationResult } from "~/domain/models/restaurant-evaluation-schema";
import {
  buildStorePhotoProxyPath,
  fetchPlaceDetails,
  type PlaceDetailsResult,
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
  hasMore: boolean;
  nextOffset: number | null;
};

export type RestaurantSearchPagination = {
  limit?: number;
  offset?: number;
};

export type RestaurantSearchStreamEvent =
  | { type: "restaurant"; restaurant: Restaurant }
  | {
      type: "done";
      fromCache: boolean;
      hasMore: boolean;
      nextOffset: number | null;
    };

export type RestaurantSearchDeps = {
  searchCandidates: typeof searchRestaurantCandidates;
  evaluateCandidates: typeof evaluateRestaurantCandidates;
  streamEvaluations: typeof streamRestaurantEvaluations;
  resolvePlaceDetails: typeof fetchPlaceDetails;
  getCached: typeof getCachedRestaurants;
  setCached: typeof setCachedRestaurants;
  logger?: Pick<Console, "info" | "warn" | "error">;
};

const defaultDeps: RestaurantSearchDeps = {
  searchCandidates: searchRestaurantCandidates,
  evaluateCandidates: evaluateRestaurantCandidates,
  streamEvaluations: streamRestaurantEvaluations,
  resolvePlaceDetails: fetchPlaceDetails,
  getCached: getCachedRestaurants,
  setCached: setCachedRestaurants,
  logger: console,
};

// placeId（例: "places/ChIJ..."）をそのまま id にすると "/" が URL 区切りと
// 衝突するため、URL や画面状態で扱いやすい形へ変換する。
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
  const names = candidates
    .map((candidate, index) => {
      const context = [
        candidate.address ? `住所: ${candidate.address}` : null,
        candidate.phone ? `電話: ${candidate.phone}` : null,
        candidate.mapsText ? `Maps情報: ${summarizeMapsText(candidate.mapsText)}` : null,
      ]
        .filter(Boolean)
        .join(" / ");
      return `${index + 1}. ${candidate.name}${context ? ` / ${context}` : ""}`;
    })
    .join("\n");
  return [
    buildGroundingPrompt(condition),
    "",
    "以下の候補について、上記の会食条件への適性を評価してください。",
    "candidateName は候補名を翻訳・補正せず、下記の文字列と完全一致させてください。",
    "displayNameJa は UI 表示用です。候補名が英語・ローマ字の場合のみ、日本語で一般に使われる店舗名へ補正してください。固有名詞の確信がない場合は null にしてください。",
    names,
    "access は住所・近隣ランドマーク・Maps情報に根拠がある場合のみ生成してください。徒歩分数など未確認の数値は作らないでください。",
    "genre は指定された分類から選び、当てはまらない・判断できない場合は other にしてください。",
    "根拠が不足する項目は null または空配列にし、確認できない事実を作らないでください。",
  ].join("\n");
}

function summarizeMapsText(text: string): string {
  return text
    .split("\n")
    .filter((line) =>
      /Address|Nearby Landmarks|Around|Near|Beside|Within|Station|駅|Phone/.test(
        line,
      ),
    )
    .join(" ")
    .slice(0, 700);
}

function createSearchLogId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

function summarizeCondition(condition: RestaurantSearchQueryCondition) {
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
    return {
      name: error.name,
      message: error.message,
      cause:
        error.cause instanceof Error
          ? { name: error.cause.name, message: error.cause.message }
          : undefined,
    };
  }
  return { message: String(error) };
}

function buildRestaurant(input: {
  candidate: GroundingCandidate;
  evaluation: RestaurantEvaluationResult | null;
  detail: PlaceDetailsResult | null;
  condition: RestaurantSearchQueryCondition;
  cacheKey: string;
  absoluteIndex: number;
  generatedAt: string;
}): Restaurant {
  const { candidate, evaluation, detail, condition, cacheKey, absoluteIndex } = input;
  return {
    // placeId は "places/ChIJ..." のように "/" を含むことがあるため、
    // URL や画面状態で扱いやすい形に変換する。
    id: buildRestaurantId(candidate.placeId, cacheKey, absoluteIndex),
    placeId: candidate.placeId,
    name: evaluation?.displayNameJa ?? candidate.name,
    genre: evaluation?.genre ?? null,
    area: condition.selectedAreas[0] ?? "",
    address: detail?.address ?? candidate.address,
    location: detail?.location ?? null,
    phone: candidate.phone,
    photoUrl: detail?.photoName ? buildStorePhotoProxyPath(detail.photoName) : null,
    score: evaluation?.score ?? null,
    room: evaluation?.room ?? null,
    quiet: evaluation?.quiet ?? null,
    prestige: evaluation?.prestige ?? null,
    service: evaluation?.service ?? null,
    access: evaluation?.access ?? null,
    budgetLabel: evaluation?.budgetLabel ?? null,
    concerns: evaluation?.concerns ?? [],
    matchingSummary: evaluation?.matchingSummary ?? null,
    evidence: evaluation?.evidence ?? [],
    confidence: evaluation?.confidence ?? null,
    generatedAt: evaluation ? input.generatedAt : null,
  };
}

export async function searchRestaurants(
  condition: RestaurantSearchQueryCondition,
  pagination: RestaurantSearchPagination = {},
  deps: RestaurantSearchDeps = defaultDeps,
): Promise<RestaurantSearchResult> {
  const logId = createSearchLogId();
  const startedAt = performance.now();
  const logger = deps.logger;
  const limit = Math.max(1, Math.min(pagination.limit ?? 10, 20));
  const offset = Math.max(0, pagination.offset ?? 0);
  const cacheKey = `${buildRestaurantSearchCacheKey(condition)}|limit=${limit}|offset=${offset}`;
  logger?.info("[restaurant-search] start", {
    logId,
    condition: summarizeCondition(condition),
    limit,
    offset,
  });

  const cached = deps.getCached(cacheKey);
  if (cached) {
    logger?.info("[restaurant-search] cache-hit", {
      logId,
      count: cached.length,
      elapsedMs: elapsedMs(startedAt),
    });
    return {
      restaurants: cached,
      fromCache: true,
      hasMore: cached.length === limit,
      nextOffset: cached.length === limit ? offset + cached.length : null,
    };
  }

  const latLng = resolveAreaLatLng(condition.selectedAreas);
  if (!latLng) {
    logger?.warn("[restaurant-search] area-not-resolved", {
      logId,
      areas: condition.selectedAreas,
      elapsedMs: elapsedMs(startedAt),
    });
    return { restaurants: [], fromCache: false, hasMore: false, nextOffset: null };
  }
  logger?.info("[restaurant-search] area-resolved", { logId, latLng });

  let candidates: GroundingCandidate[];
  try {
    const groundingStartedAt = performance.now();
    candidates = await deps.searchCandidates({
      prompt: buildGroundingPrompt(condition),
      latLng,
    });
    logger?.info("[restaurant-search] grounding-complete", {
      logId,
      count: candidates.length,
      sampleNames: candidates.slice(0, 5).map((candidate) => candidate.name),
      elapsedMs: elapsedMs(groundingStartedAt),
    });
  } catch (error) {
    logger?.error("[restaurant-search] grounding-failed", {
      logId,
      error: summarizeError(error),
      elapsedMs: elapsedMs(startedAt),
    });
    throw error;
  }

  if (candidates.length === 0) {
    logger?.warn("[restaurant-search] no-grounding-candidates", {
      logId,
      elapsedMs: elapsedMs(startedAt),
    });
    return { restaurants: [], fromCache: false, hasMore: false, nextOffset: null };
  }
  const pageCandidates = candidates.slice(offset, offset + limit);

  let evaluations;
  try {
    const evaluationStartedAt = performance.now();
    evaluations = await deps.evaluateCandidates({
      prompt: buildEvaluationPrompt(condition, pageCandidates),
    });
    logger?.info("[restaurant-search] evaluation-complete", {
      logId,
      count: evaluations.length,
      elapsedMs: elapsedMs(evaluationStartedAt),
    });
  } catch (error) {
    logger?.error("[restaurant-search] evaluation-failed", {
      logId,
      candidateCount: candidates.length,
      error: summarizeError(error),
      elapsedMs: elapsedMs(startedAt),
    });
    throw error;
  }

  const evaluationByName = new Map(
    evaluations.map((evaluation) => [evaluation.candidateName, evaluation]),
  );
  const placesStartedAt = performance.now();
  const placeDetails = await Promise.all(
    pageCandidates.map(async (candidate) => {
      try {
        return await deps.resolvePlaceDetails(candidate.placeId);
      } catch (error) {
        logger?.warn("[restaurant-search] place-details-failed", {
          logId,
          candidateName: candidate.name,
          hasPlaceId: Boolean(candidate.placeId),
          error: summarizeError(error),
        });
        return null;
      }
    }),
  );
  logger?.info("[restaurant-search] place-details-complete", {
    logId,
    requested: pageCandidates.length,
    resolved: placeDetails.filter(Boolean).length,
    elapsedMs: elapsedMs(placesStartedAt),
  });

  const generatedAt = new Date().toISOString();
  const restaurants: Restaurant[] = pageCandidates.map((candidate, index) => {
    const evaluation = evaluationByName.get(candidate.name) ?? null;
    const absoluteIndex = offset + index;
    const detail = placeDetails[index] ?? null;
    return buildRestaurant({
      candidate,
      evaluation,
      detail,
      condition,
      cacheKey,
      absoluteIndex,
      generatedAt,
    });
  });

  deps.setCached(cacheKey, restaurants);
  const hasMore = offset + restaurants.length < candidates.length;
  logger?.info("[restaurant-search] complete", {
    logId,
    returned: restaurants.length,
    candidateCount: candidates.length,
    evaluatedCount: evaluations.length,
    hasMore,
    nextOffset: hasMore ? offset + restaurants.length : null,
    elapsedMs: elapsedMs(startedAt),
  });
  return {
    restaurants,
    fromCache: false,
    hasMore,
    nextOffset: hasMore ? offset + restaurants.length : null,
  };
}

export async function* streamRestaurants(
  condition: RestaurantSearchQueryCondition,
  pagination: RestaurantSearchPagination = {},
  deps: RestaurantSearchDeps = defaultDeps,
): AsyncGenerator<RestaurantSearchStreamEvent> {
  const logId = createSearchLogId();
  const startedAt = performance.now();
  const logger = deps.logger;
  const limit = Math.max(1, Math.min(pagination.limit ?? 10, 20));
  const offset = Math.max(0, pagination.offset ?? 0);
  const cacheKey = `${buildRestaurantSearchCacheKey(condition)}|limit=${limit}|offset=${offset}`;
  logger?.info("[restaurant-search-stream] start", {
    logId,
    condition: summarizeCondition(condition),
    limit,
    offset,
  });

  const cached = deps.getCached(cacheKey);
  if (cached) {
    for (const restaurant of cached) {
      yield { type: "restaurant", restaurant };
    }
    yield {
      type: "done",
      fromCache: true,
      hasMore: cached.length === limit,
      nextOffset: cached.length === limit ? offset + cached.length : null,
    };
    return;
  }

  const latLng = resolveAreaLatLng(condition.selectedAreas);
  if (!latLng) {
    logger?.warn("[restaurant-search-stream] area-not-resolved", {
      logId,
      areas: condition.selectedAreas,
      elapsedMs: elapsedMs(startedAt),
    });
    yield { type: "done", fromCache: false, hasMore: false, nextOffset: null };
    return;
  }

  const candidates = await deps.searchCandidates({
    prompt: buildGroundingPrompt(condition),
    latLng,
  });
  logger?.info("[restaurant-search-stream] grounding-complete", {
    logId,
    count: candidates.length,
    sampleNames: candidates.slice(0, 5).map((candidate) => candidate.name),
    elapsedMs: elapsedMs(startedAt),
  });

  if (candidates.length === 0) {
    yield { type: "done", fromCache: false, hasMore: false, nextOffset: null };
    return;
  }

  const pageCandidates = candidates.slice(offset, offset + limit);
  const generatedAt = new Date().toISOString();
  const yielded = new Set<string>();
  const restaurants: Restaurant[] = [];
  const detailPromises = new Map(
    pageCandidates.map((candidate) => [
      candidate.name,
      deps.resolvePlaceDetails(candidate.placeId).catch((error) => {
        logger?.warn("[restaurant-search-stream] place-details-failed", {
          logId,
          candidateName: candidate.name,
          hasPlaceId: Boolean(candidate.placeId),
          error: summarizeError(error),
        });
        return null;
      }),
    ]),
  );

  try {
    for await (const evaluation of deps.streamEvaluations({
      prompt: buildEvaluationPrompt(condition, pageCandidates),
    })) {
      const candidateIndex = pageCandidates.findIndex(
        (candidate) => candidate.name === evaluation.candidateName,
      );
      if (candidateIndex === -1) {
        logger?.warn("[restaurant-search-stream] evaluation-name-unmatched", {
          logId,
          candidateName: evaluation.candidateName,
        });
        continue;
      }

      const candidate = pageCandidates[candidateIndex];
      if (yielded.has(candidate.name)) continue;

      const detail = (await detailPromises.get(candidate.name)) ?? null;
      const restaurant = buildRestaurant({
        candidate,
        evaluation,
        detail,
        condition,
        cacheKey,
        absoluteIndex: offset + candidateIndex,
        generatedAt,
      });
      yielded.add(candidate.name);
      restaurants.push(restaurant);
      yield { type: "restaurant", restaurant };
    }
  } catch (error) {
    logger?.error("[restaurant-search-stream] evaluation-stream-failed", {
      logId,
      error: summarizeError(error),
      elapsedMs: elapsedMs(startedAt),
    });
  }

  for (const [index, candidate] of pageCandidates.entries()) {
    if (yielded.has(candidate.name)) continue;
    const detail = (await detailPromises.get(candidate.name)) ?? null;
    const restaurant = buildRestaurant({
      candidate,
      evaluation: null,
      detail,
      condition,
      cacheKey,
      absoluteIndex: offset + index,
      generatedAt,
    });
    restaurants.push(restaurant);
    yield { type: "restaurant", restaurant };
  }

  deps.setCached(cacheKey, restaurants);
  const hasMore = offset + restaurants.length < candidates.length;
  logger?.info("[restaurant-search-stream] complete", {
    logId,
    returned: restaurants.length,
    candidateCount: candidates.length,
    hasMore,
    nextOffset: hasMore ? offset + restaurants.length : null,
    elapsedMs: elapsedMs(startedAt),
  });
  yield {
    type: "done",
    fromCache: false,
    hasMore,
    nextOffset: hasMore ? offset + restaurants.length : null,
  };
}
