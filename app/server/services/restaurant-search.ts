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
import { computeMatchTier } from "~/utils/scoring";
import {
  buildBookingConditionSummary,
  buildPlaceSearchQuery,
  summarizeRestaurantSearchCondition,
  type RestaurantSearchQueryCondition,
} from "./restaurant-search-query";
import { summarizeError } from "~/server/utils/summarize-error";
import { getRestaurantDeduplicationKey } from "~/utils/restaurant-deduplication";

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
  existingRestaurantKeys?: string[];
};

export type RestaurantSearchStreamEvent =
  | { type: "phase"; phase: "searching" | "evaluating" }
  | { type: "restaurant"; restaurant: Restaurant }
  | { type: "restaurant-evaluated"; restaurant: Restaurant }
  | { type: "error"; message: string }
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
  const searchLatLng = condition.searchLatLng
    ? `${condition.searchLatLng.latitude.toFixed(5)},${condition.searchLatLng.longitude.toFixed(5)}`
    : "area";
  return [
    areas,
    searchLatLng,
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

// AI評価の根拠は店名とヒアリング条件のみにする。Places API由来の住所・電話・評価点・
// 口コミ要約は Google Maps Platform 利用規約上の帰属表示義務が及ぶため、自社AIの
// 評価プロンプトへの入力（＝表示以外の用途）には使わない判断とした。
function buildEvaluationPrompt(
  condition: RestaurantSearchQueryCondition,
  candidates: PlaceSearchCandidate[],
): string {
  const names = candidates
    .map((candidate, index) => `${index + 1}. ${candidate.name}`)
    .join("\n");
  return [
    buildBookingConditionSummary(condition),
    "",
    "以下の候補について、上記の会食条件への適性を評価してください。",
    "candidateIndex には下記候補一覧の番号（1始まり）をそのまま入れてください。",
    "candidateName は候補名を翻訳・補正せず、下記の文字列と完全一致させてください。",
    names,
    "access は店名から特定できる一般的な知識に根拠がある場合のみ生成してください。徒歩分数など未確認の数値は作らないでください。",
    "根拠が不足する項目は null または空配列にし、確認できない事実を作らないでください。",
  ].join("\n");
}

function createSearchLogId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

function excludeExistingCandidates(
  candidates: PlaceSearchCandidate[],
  existingRestaurantKeys: string[] = [],
): PlaceSearchCandidate[] {
  if (existingRestaurantKeys.length === 0) return candidates;
  const existingKeys = new Set(existingRestaurantKeys);
  return candidates.filter(
    (candidate) => !existingKeys.has(getRestaurantDeduplicationKey(candidate)),
  );
}

export function resolveRestaurantAreaFromAddress(address: string | null): string | null {
  if (!address) return null;
  const normalized = address
    .replace(/^日本、?/, "")
    .replace(/〒\d{3}-?\d{4}/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!normalized) return null;

  const areaPrefix = normalized.split(/[0-9０-９]/)[0];
  let area = areaPrefix.replace(/^[^都道府県]+[都道府県]/, "");
  let previous = "";
  while (area && area !== previous) {
    previous = area;
    area = area.replace(/^[^市区町村]+[市区町村]/, "");
  }

  return area.length > 0 ? area : null;
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
    genre: candidate.genre,
    area:
      resolveRestaurantAreaFromAddress(candidate.address) ??
      condition.selectedAreas[0] ??
      "",
    address: candidate.address,
    location: candidate.location,
    phone: candidate.phone,
    photoUrl: candidate.photoName ? buildStorePhotoProxyPath(candidate.photoName) : null,
    matchTier: evaluation
      ? computeMatchTier({
          restaurant: evaluation,
          counterpartId: condition.counterpart,
          priorities: condition.priorities,
          budgetMin: condition.budgetMin,
          budgetMax: condition.budgetMax,
        })
      : null,
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
  const existingRestaurantKeys = pagination.existingRestaurantKeys ?? [];
  const searchKey = `${buildSearchConditionKey(condition)}|limit=${limit}|offset=${offset}`;
  logger?.info("[restaurant-search] start", {
    logId,
    condition: summarizeRestaurantSearchCondition(condition),
    limit,
    offset,
  });

  const latLng = condition.searchLatLng ?? resolveAreaLatLng(condition.selectedAreas);
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
  const newCandidates = excludeExistingCandidates(candidates, existingRestaurantKeys);
  const pageCandidates = newCandidates.slice(offset, offset + limit);

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

  // candidateIndex は buildEvaluationPrompt が振った1始まりの番号。文字列の店名一致に
  // 頼ると、AIの表記揺れや同名店舗の重複で取りこぼすため、番号で突合する。
  const evaluationByIndex = new Map(
    evaluations.map((evaluation) => [evaluation.candidateIndex - 1, evaluation]),
  );

  const generatedAt = new Date().toISOString();
  const restaurants: Restaurant[] = pageCandidates.map((candidate, index) => {
    const evaluation = evaluationByIndex.get(index) ?? null;
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

  const hasMore = offset + restaurants.length < newCandidates.length;
  logger?.info("[restaurant-search] complete", {
    logId,
    returned: restaurants.length,
    candidateCount: candidates.length,
    newCandidateCount: newCandidates.length,
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
  const existingRestaurantKeys = pagination.existingRestaurantKeys ?? [];
  const searchKey = `${buildSearchConditionKey(condition)}|limit=${limit}|offset=${offset}`;
  logger?.info("[restaurant-search-stream] start", {
    logId,
    condition: summarizeRestaurantSearchCondition(condition),
    limit,
    offset,
  });

  yield { type: "phase", phase: "searching" };

  const latLng = condition.searchLatLng ?? resolveAreaLatLng(condition.selectedAreas);
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

  const newCandidates = excludeExistingCandidates(candidates, existingRestaurantKeys);
  if (newCandidates.length === 0) {
    yield { type: "done", fromCache: false, hasMore: false, nextOffset: null };
    return;
  }

  const pageCandidates = newCandidates.slice(offset, offset + limit);
  const generatedAt = new Date().toISOString();

  // 施設検索の結果はここで確定しているため、AI評価を待たずに基本形をまとめて
  // 先に届ける（同期ループなので実質1回のNDJSON書き込みバーストになる）。
  for (const [index, candidate] of pageCandidates.entries()) {
    const restaurant = buildRestaurant({
      candidate,
      evaluation: null,
      condition,
      searchKey,
      absoluteIndex: offset + index,
      generatedAt,
    });
    yield { type: "restaurant", restaurant };
  }

  yield { type: "phase", phase: "evaluating" };

  const evaluated = new Set<number>();

  try {
    for await (const evaluation of deps.streamEvaluations({
      prompt: buildEvaluationPrompt(condition, pageCandidates),
    })) {
      // candidateIndex は buildEvaluationPrompt が振った1始まりの番号。文字列の店名一致に
      // 頼ると、AIの表記揺れや同名店舗の重複で取りこぼすため、番号で突合する。
      const candidateIndex = evaluation.candidateIndex - 1;
      const candidate = pageCandidates[candidateIndex];
      if (!candidate) {
        logger?.warn("[restaurant-search-stream] evaluation-index-unmatched", {
          logId,
          candidateIndex: evaluation.candidateIndex,
          candidateName: evaluation.candidateName,
        });
        continue;
      }
      if (evaluated.has(candidateIndex)) continue;

      const restaurant = buildRestaurant({
        candidate,
        evaluation,
        condition,
        searchKey,
        absoluteIndex: offset + candidateIndex,
        generatedAt,
      });
      evaluated.add(candidateIndex);
      yield { type: "restaurant-evaluated", restaurant };
    }
  } catch (error) {
    logger?.error("[restaurant-search-stream] evaluation-stream-failed", {
      logId,
      error: summarizeError(error),
      elapsedMs: elapsedMs(startedAt),
    });
    // 施設検索の基本形は既に送信済みのため検索自体は失敗にしない。評価だけが
    // 欠けたことをクライアントに伝え、UIで非破壊的な警告として表示できるようにする
    // （docs/ARCHITECTURE.md「評価呼び出しが失敗した場合は結果画面にエラー状態を明示する」）。
    yield {
      type: "error",
      message: "一部の店舗のAI評価取得に失敗しました。表示中の情報は基本情報のみです。",
    };
  }
  // 評価が届かなかった候補（ストリーム失敗・取りこぼし）は、上で送った基本形の
  // ままにする。手順の先頭で全候補分の "restaurant" イベントを保証しているため、
  // 未評価分を再送するフォールバックは不要。

  const hasMore = offset + pageCandidates.length < newCandidates.length;
  logger?.info("[restaurant-search-stream] complete", {
    logId,
    returned: pageCandidates.length,
    evaluatedCount: evaluated.size,
    candidateCount: candidates.length,
    newCandidateCount: newCandidates.length,
    hasMore,
    nextOffset: hasMore ? offset + pageCandidates.length : null,
    elapsedMs: elapsedMs(startedAt),
  });
  yield {
    type: "done",
    fromCache: false,
    hasMore,
    nextOffset: hasMore ? offset + pageCandidates.length : null,
  };
}
