import type { ActionFunctionArgs } from "react-router";
import type { Restaurant } from "~/domain/models/restaurant";
import {
  getRestaurantSearchRepository,
  type RestaurantSearchRepository,
} from "~/server/repositories/restaurant-search-repository";
import {
  streamRestaurants,
  type RestaurantSearchStreamEvent,
  type RestaurantSearchPagination,
} from "~/server/services/restaurant-search";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";
import { parseRestaurantSearchPagination } from "~/server/services/restaurant-search-pagination";
import { summarizeError } from "~/server/utils/summarize-error";
import { getRestaurantDeduplicationKey } from "~/utils/restaurant-deduplication";

// mock mode のフィクスチャは既に評価済みの形なので、施設検索直後の
// 「未評価」段階表示を目視確認できるよう、AI生成フィールドを一時的に null 化する。
function toBaseRestaurant(restaurant: Restaurant): Restaurant {
  return {
    ...restaurant,
    genre: null,
    matchTier: null,
    room: null,
    quiet: null,
    prestige: null,
    service: null,
    access: null,
    budgetLabel: null,
    concerns: [],
    matchingSummary: null,
    evidence: [],
    confidence: null,
    generatedAt: null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RestaurantSearchStreamRequest = RestaurantSearchQueryCondition & {
  limit?: number;
  offset?: number;
  existingRestaurantKeys?: unknown;
};

type StreamEvent = RestaurantSearchStreamEvent;

const encoder = new TextEncoder();

function encodeEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

type PumpRestaurantSearchStreamInput = {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  abortSignal: AbortSignal;
  condition: RestaurantSearchQueryCondition;
  pagination: RestaurantSearchPagination;
  repository: RestaurantSearchRepository;
  mode: string | undefined;
  streamRestaurantsFn?: typeof streamRestaurants;
};

export async function pumpRestaurantSearchStream({
  writer,
  abortSignal,
  condition,
  pagination,
  repository,
  mode,
  streamRestaurantsFn = streamRestaurants,
}: PumpRestaurantSearchStreamInput): Promise<void> {
  let closed = false;

  const send = async (event: StreamEvent) => {
    if (closed || abortSignal.aborted) return;
    try {
      await writer.write(encodeEvent(event));
    } catch {
      closed = true;
    }
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await writer.close();
    } catch {
      // already closed
    }
  };

  try {
    if (mode === "mock") {
      await send({ type: "phase", phase: "searching" });
      const result = await repository.search(condition, pagination);
      const existingRestaurantKeys = new Set(pagination.existingRestaurantKeys);
      const restaurants = result.restaurants.filter(
        (restaurant) =>
          !existingRestaurantKeys.has(
            getRestaurantDeduplicationKey(restaurant),
          ),
      );
      for (const restaurant of restaurants) {
        await send({
          type: "restaurant",
          restaurant: toBaseRestaurant(restaurant),
        });
      }
      await send({ type: "phase", phase: "evaluating" });
      for (const restaurant of restaurants) {
        if (closed || abortSignal.aborted) return;
        await sleep(150); // 段階表示（先に一覧、後からマッチ度）を目視確認できるようにする
        await send({ type: "restaurant-evaluated", restaurant });
      }
      await send({
        type: "done",
        fromCache: result.fromCache,
        hasMore: result.hasMore,
        nextOffset: result.nextOffset,
      });
      return;
    }

    for await (const event of streamRestaurantsFn(condition, pagination)) {
      if (closed || abortSignal.aborted) return;
      await send(event);
    }
  } catch (error) {
    if (!abortSignal.aborted) {
      console.error("[restaurants-search-stream-route] failed", {
        error: summarizeError(error),
      });
      await send({ type: "error", message: "レストラン検索に失敗しました。" });
      await send({
        type: "done",
        fromCache: false,
        hasMore: false,
        nextOffset: null,
      });
    }
  } finally {
    await close();
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const abortSignal = request.signal;

  let body: RestaurantSearchStreamRequest;
  try {
    body = (await request.json()) as RestaurantSearchStreamRequest;
  } catch {
    return Response.json({ error: "JSON body is required" }, { status: 400 });
  }

  const {
    limit: rawLimit,
    offset: rawOffset,
    existingRestaurantKeys: rawExistingRestaurantKeys,
    ...condition
  } = body;
  const pagination = parseRestaurantSearchPagination({
    limit: rawLimit,
    offset: rawOffset,
    existingRestaurantKeys: Array.isArray(rawExistingRestaurantKeys)
      ? rawExistingRestaurantKeys.filter(
          (key): key is string => typeof key === "string",
        )
      : [],
  });

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  void pumpRestaurantSearchStream({
    writer: writable.getWriter(),
    abortSignal,
    condition,
    pagination,
    repository: getRestaurantSearchRepository(),
    mode: process.env.MODE,
  });

  return new Response(readable, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
