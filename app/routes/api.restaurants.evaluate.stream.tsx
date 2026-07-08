import type { ActionFunctionArgs } from "react-router";
import { isRestaurant, type Restaurant } from "~/domain/models/restaurant";
import {
  streamEvaluationsForRestaurants,
  type RestaurantSearchStreamEvent,
} from "~/server/services/restaurant-search";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";
import { summarizeError } from "~/server/utils/summarize-error";

type RestaurantEvaluationStreamRequest = RestaurantSearchQueryCondition & {
  restaurants?: unknown;
};

const encoder = new TextEncoder();

function encodeEvent(event: RestaurantSearchStreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

async function sendEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: RestaurantSearchStreamEvent,
): Promise<void> {
  await writer.write(encodeEvent(event));
}

export async function action({ request }: ActionFunctionArgs) {
  const abortSignal = request.signal;
  let body: RestaurantEvaluationStreamRequest;
  try {
    body = (await request.json()) as RestaurantEvaluationStreamRequest;
  } catch {
    return Response.json({ error: "JSON body is required" }, { status: 400 });
  }

  const { restaurants: rawRestaurants, ...condition } = body;
  if (!Array.isArray(rawRestaurants)) {
    return Response.json({ error: "restaurants array is required" }, { status: 400 });
  }

  const restaurants: Restaurant[] = rawRestaurants.filter(isRestaurant);
  if (restaurants.length === 0) {
    return Response.json({ error: "valid restaurants are required" }, { status: 400 });
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  void (async () => {
    let closed = false;
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
      for await (const event of streamEvaluationsForRestaurants(
        condition,
        restaurants,
      )) {
        if (abortSignal.aborted) return;
        await sendEvent(writer, event);
      }
    } catch (error) {
      if (!abortSignal.aborted) {
        console.error("[restaurant-evaluate-stream-route] failed", {
          error: summarizeError(error),
        });
        await sendEvent(writer, {
          type: "error",
          message: "一部の店舗のAI評価取得に失敗しました。表示中の情報は基本情報のみです。",
        });
        await sendEvent(writer, {
          type: "done",
          fromCache: false,
          hasMore: false,
          nextOffset: null,
        });
      }
    } finally {
      await close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
