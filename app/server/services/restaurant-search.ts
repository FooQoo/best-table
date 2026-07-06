import type { Restaurant } from "~/domain/models/restaurant";
import { resolveAreaLatLng } from "~/constants/area-coordinates";
import {
  searchPlacesByText,
  type PlaceSearchCandidate,
  buildStorePhotoProxyPath,
} from "~/server/clients/google-places";
import {
  evaluateRestaurantCandidates,
  streamRestaurantEvaluations,
} from "~/server/clients/gemini-evaluation";
import type { RestaurantEvaluationResult } from "~/domain/models/restaurant-evaluation-schema";
import {
  buildBookingConditionSummary,
  buildPlaceSearchQuery,
  summarizeRestaurantSearchCondition,
  type RestaurantSearchQueryCondition,
} from "./restaurant-search-query";
import { summarizeError } from "~/server/utils/summarize-error";

// docs/ARCHITECTURE.md「検索・評価型」のユースケース単位のオーケストレーション。
// 施設検索（Places API Text Search） → 構造化評価（Gemini）の順に直列実行し、
// 結果をまとめて返す。施設検索は決定的な REST 呼び出しのため、同一条件での
// 再実行（ページング含む）でも候補の重複・欠落は起きない。
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
  | { type: "phase"; phase: "searching" | "evaluating" }
  | { type: "restaurant"; restaurant: Restaurant }
  | {
      type: "done";
      fromCache: boolean;
      hasMore: boolean;
      nextOffset: number | null;
    };

export type RestaurantSearchDeps = {
  searchCandidates: typeof searchPlacesByText;
  evaluateCandidates: typeof evaluateRestaurantCandidates;
  streamEvaluations: typeof streamRestaurantEvaluations;
  logger?: Pick<Console, "info" | "warn" | "error">;
};

const defaultDeps: RestaurantSearchDeps = {
  searchCandidates: searchPlacesByText,
  evaluateCandidates: evaluateRestaurantCandidates,
  streamEvaluations: streamRestaurantEvaluations,
  logger: console,
};

// 店舗 id のフォールバック生成にのみ使う条件キー（キャッシュキーではない）。
// 選択順序に意味を持たせないよう、配列項目はソートしてから結合する。
function buildSearchConditionKey(condition: RestaurantSearchQueryCondition): string {
  const areas = [...condition.selectedAreas].sort().join(",");
  const priorities = [...condition.priorities].sort().join(",");
  return [
    areas,
    condition.date,
    condition.time,
    String(condition.people),
    condition.budgetMin,
    condition.budgetMax,
    priorities,
    condition.counterpart ?? "none",
  ].join("|");
}

// 施設検索呼び出し。両関数（searchRestaurants / streamRestaurants）で共通。
// Text Search は決定的なので、同一条件・同一 pageSize なら常に同じ順序の候補を返す。
// ページングのたびに呼び直しても重複・欠落は起きない。
async function resolvePlaceCandidates(input: {
  condition: RestaurantSearchQueryCondition;
  latLng: { latitude: number; longitude: number };
  pageSize: number;
  deps: RestaurantSearchDeps;
  logId: string;
  startedAt: number;
  logPrefix: string;
}): Promise<PlaceSearchCandidate[]> {
  const { condition, latLng, pageSize, deps, logId, startedAt, logPrefix } = input;
  const logger = deps.logger;

  const candidates = await deps.searchCandidates({
    textQuery: buildPlaceSearchQuery(condition),
    latLng,
    pageSize,
  });
  logger?.info(`[${logPrefix}] place-search-complete`, {
    logId,
    count: candidates.length,
    sampleNames: candidates.slice(0, 5).map((candidate) => candidate.name),
    elapsedMs: elapsedMs(startedAt),
  });
  return candidates;
}

// placeId（例: "places/ChIJ..."）をそのまま id にすると "/" が URL 区切りと
// 衝突するため、URL や画面状態で扱いやすい形へ変換する。
export function buildRestaurantId(
  placeId: string | null,
  searchKey: string,
  index: number,
): string {
  if (!placeId) return `${searchKey}-${index}`;
  return placeId.replace(/\//g, "_");
}

function buildEvaluationPrompt(
  condition: RestaurantSearchQueryCondition,
  candidates: PlaceSearchCandidate[],
): string {
  const names = candidates
    .map((candidate, index) => {
      const context = [
        candidate.address ? `住所: ${candidate.address}` : null,
        candidate.phone ? `電話: ${candidate.phone}` : null,
      ]
        .filter(Boolean)
        .join(" / ");
      return `${index + 1}. ${candidate.name}${context ? ` / ${context}` : ""}`;
    })
    .join("\n");
  return [
    buildBookingConditionSummary(condition),
    "",
    "以下の候補について、上記の会食条件への適性を評価してください。",
    "candidateName は候補名を翻訳・補正せず、下記の文字列と完全一致させてください。",
    names,
    "access は住所やエリアの一般的な知識から根拠がある場合のみ生成してください。徒歩分数など未確認の数値は作らないでください。",
    "genre は指定された分類から選び、当てはまらない・判断できない場合は other にしてください。",
    "根拠が不足する項目は null または空配列にし、確認できない事実を作らないでください。",
  ].join("\n");
}

function createSearchLogId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

function buildRestaurant(input: {
  candidate: PlaceSearchCandidate;
  evaluation: RestaurantEvaluationResult | null;
  condition: RestaurantSearchQueryCondition;
  searchKey: string;
  absoluteIndex: number;
  generatedAt: string;
}): Restaurant {
  const { candidate, evaluation, condition, searchKey, absoluteIndex } = input;
  return {
    // placeId は "places/ChIJ..." のように "/" を含むことがあるため、
    // URL や画面状態で扱いやすい形に変換する。
    id: buildRestaurantId(candidate.placeId, searchKey, absoluteIndex),
    placeId: candidate.placeId,
    name: candidate.name,
    genre: evaluation?.genre ?? null,
    area: condition.selectedAreas[0] ?? "",
    address: candidate.address,
    location: candidate.location,
    phone: candidate.phone,
    photoUrl: candidate.photoName ? buildStorePhotoProxyPath(candidate.photoName) : null,
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
  const searchKey = `${buildSearchConditionKey(condition)}|limit=${limit}|offset=${offset}`;
  logger?.info("[restaurant-search] start", {
    logId,
    condition: summarizeRestaurantSearchCondition(condition),
    limit,
    offset,
  });

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

  let candidates: PlaceSearchCandidate[];
  try {
    candidates = await resolvePlaceCandidates({
      condition,
      latLng,
      pageSize: offset + limit,
      deps,
      logId,
      startedAt,
      logPrefix: "restaurant-search",
    });
  } catch (error) {
    logger?.error("[restaurant-search] place-search-failed", {
      logId,
      error: summarizeError(error),
      elapsedMs: elapsedMs(startedAt),
    });
    throw error;
  }

  if (candidates.length === 0) {
    logger?.warn("[restaurant-search] no-search-candidates", {
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

  const generatedAt = new Date().toISOString();
  const restaurants: Restaurant[] = pageCandidates.map((candidate, index) => {
    const evaluation = evaluationByName.get(candidate.name) ?? null;
    const absoluteIndex = offset + index;
    return buildRestaurant({
      candidate,
      evaluation,
      condition,
      searchKey,
      absoluteIndex,
      generatedAt,
    });
  });

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
  const searchKey = `${buildSearchConditionKey(condition)}|limit=${limit}|offset=${offset}`;
  logger?.info("[restaurant-search-stream] start", {
    logId,
    condition: summarizeRestaurantSearchCondition(condition),
    limit,
    offset,
  });

  yield { type: "phase", phase: "searching" };

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

  const candidates = await resolvePlaceCandidates({
    condition,
    latLng,
    pageSize: offset + limit,
    deps,
    logId,
    startedAt,
    logPrefix: "restaurant-search-stream",
  });

  if (candidates.length === 0) {
    yield { type: "done", fromCache: false, hasMore: false, nextOffset: null };
    return;
  }

  yield { type: "phase", phase: "evaluating" };

  const pageCandidates = candidates.slice(offset, offset + limit);
  const generatedAt = new Date().toISOString();
  const yielded = new Set<string>();
  const restaurants: Restaurant[] = [];

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

      const restaurant = buildRestaurant({
        candidate,
        evaluation,
        condition,
        searchKey,
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
    const restaurant = buildRestaurant({
      candidate,
      evaluation: null,
      condition,
      searchKey,
      absoluteIndex: offset + index,
      generatedAt,
    });
    restaurants.push(restaurant);
    yield { type: "restaurant", restaurant };
  }

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
