import { describe, expect, it } from "vitest";
import { canRequestMoreResults } from "./results-screen";

describe("canRequestMoreResults", () => {
  it("allows loading the next page only when there is a next offset and no active load", () => {
    expect(
      canRequestMoreResults({
        isLoadingMore: false,
        hasMore: true,
        nextOffset: 10,
      }),
    ).toBe(true);
  });

  it("prevents duplicate loads while loading or when the API says there is no next page", () => {
    expect(
      canRequestMoreResults({
        isLoadingMore: true,
        hasMore: true,
        nextOffset: 10,
      }),
    ).toBe(false);
    expect(
      canRequestMoreResults({
        isLoadingMore: false,
        hasMore: false,
        nextOffset: 10,
      }),
    ).toBe(false);
    expect(
      canRequestMoreResults({
        isLoadingMore: false,
        hasMore: true,
        nextOffset: null,
      }),
    ).toBe(false);
  });
});
