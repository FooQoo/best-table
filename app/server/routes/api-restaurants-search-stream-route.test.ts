import { describe, expect, it, vi } from "vitest";
import { pumpRestaurantSearchStream } from "../../routes/api.restaurants.search.stream";
import type { RestaurantSearchRepository } from "~/server/repositories/restaurant-search-repository";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";

const condition: RestaurantSearchQueryCondition = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "指定なし",
  budgetMax: "指定なし",
  budgetOtherOn: false,
  budgetOtherText: "",
  priorities: ["room"],
  priorityOtherOn: false,
  priorityOtherText: "",
  counterpart: "exec",
  counterpartOtherText: "",
};

describe("pumpRestaurantSearchStream", () => {
  it("flushes the first stream event before the full search pipeline completes", async () => {
    let unblockCompletion!: () => void;
    const waitForCompletion = new Promise<void>((resolve) => {
      unblockCompletion = resolve;
    });
    const streamRestaurantsFn = vi.fn(async function* () {
      yield { type: "phase", phase: "searching" } as const;
      await waitForCompletion;
      yield {
        type: "done",
        fromCache: false,
        hasMore: false,
        nextOffset: null,
      } as const;
    });
    const repository: RestaurantSearchRepository = {
      search: vi.fn(async () => ({
        restaurants: [],
        fromCache: false,
        hasMore: false,
        nextOffset: null,
      })),
    };
    const chunks: string[] = [];
    const writer = {
      write: vi.fn(async (chunk: Uint8Array) => {
        chunks.push(new TextDecoder().decode(chunk).trim());
      }),
      close: vi.fn(async () => {}),
    } as unknown as WritableStreamDefaultWriter<Uint8Array>;

    const pumpPromise = pumpRestaurantSearchStream({
      writer,
      abortSignal: new AbortController().signal,
      condition,
      pagination: {},
      repository,
      mode: "real",
      streamRestaurantsFn,
    });

    await vi.waitFor(() => {
      expect(chunks).toContain(
        JSON.stringify({ type: "phase", phase: "searching" }),
      );
    });
    expect(chunks).not.toContain(
      JSON.stringify({
        type: "done",
        fromCache: false,
        hasMore: false,
        nextOffset: null,
      }),
    );

    unblockCompletion();
    await pumpPromise;
  });
});
