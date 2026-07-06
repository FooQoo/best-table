import type { ActionFunctionArgs } from "react-router";
import { getRestaurantSearchRepository } from "~/server/repositories/restaurant-search-repository";
import {
  streamRestaurants,
  type RestaurantSearchStreamEvent,
  type RestaurantSearchPagination,
} from "~/server/services/restaurant-search";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";

type RestaurantSearchStreamRequest = RestaurantSearchQueryCondition & {
  limit?: number;
  offset?: number;
};

type StreamEvent =
  | RestaurantSearchStreamEvent
  | { type: "error"; message: string };

const encoder = new TextEncoder();

function parsePageValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function encodeEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

export async function action({ request }: ActionFunctionArgs) {
  const abortSignal = request.signal;

  let body: RestaurantSearchStreamRequest;
  try {
    body = (await request.json()) as RestaurantSearchStreamRequest;
  } catch {
    return Response.json({ error: "JSON body is required" }, { status: 400 });
  }

  const { limit: rawLimit, offset: rawOffset, ...condition } = body;
  const pagination: RestaurantSearchPagination = {
    limit: Math.max(1, Math.min(parsePageValue(rawLimit, 10), 20)),
    offset: Math.max(0, parsePageValue(rawOffset, 0)),
  };

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: StreamEvent) => {
        if (closed || abortSignal.aborted) return;
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      try {
        const repository = getRestaurantSearchRepository();

        if (process.env.MODE === "mock") {
          const result = await repository.search(condition, pagination);
          for (const restaurant of result.restaurants) {
            send({ type: "restaurant", restaurant });
          }
          send({
            type: "done",
            fromCache: result.fromCache,
            hasMore: result.hasMore,
            nextOffset: result.nextOffset,
          });
          return;
        }

        for await (const event of streamRestaurants(condition, pagination)) {
          if (closed || abortSignal.aborted) return;
          send(event);
        }
      } catch (error) {
        if (!abortSignal.aborted) {
          console.error("[restaurants-search-stream-route] failed", {
            error: summarizeError(error),
          });
          send({ type: "error", message: "レストラン検索に失敗しました。" });
          send({
            type: "done",
            fromCache: false,
            hasMore: false,
            nextOffset: null,
          });
        }
      } finally {
        close();
      }
    },
    cancel() {
      // Client disconnected; the start() closure observes abortSignal/closed.
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
