import { describe, expect, it } from "vitest";
import {
  canRequestMoreResults,
  isSearchResponse,
  toggleSelectedStoreId,
} from "./results-screen";

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

describe("toggleSelectedStoreId", () => {
  it("未選択または別店舗のときは、押した店舗の詳細パネルをONにする", () => {
    expect(toggleSelectedStoreId(null, "store-a")).toBe("store-a");
    expect(toggleSelectedStoreId("store-b", "store-a")).toBe("store-a");
  });

  it("詳細パネルがONの店舗を再度押すとOFFにする", () => {
    expect(toggleSelectedStoreId("store-a", "store-a")).toBeNull();
  });
});

describe("isSearchResponse", () => {
  it("accepts the expected restaurant search response shape", () => {
    expect(
      isSearchResponse({
        restaurants: [],
        fromCache: false,
        hasMore: false,
        nextOffset: null,
      }),
    ).toBe(true);
  });

  it("rejects error payloads before they can be stored as restaurants state", () => {
    expect(isSearchResponse({ error: "レストラン検索に失敗しました。" })).toBe(false);
    expect(
      isSearchResponse({
        restaurants: { error: "not an array" },
        fromCache: false,
        hasMore: false,
        nextOffset: null,
      }),
    ).toBe(false);
  });
});
