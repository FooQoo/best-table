import { describe, expect, it } from "vitest";
import {
  canRequestMoreResults,
  hasMapCenterMoved,
  selectStoreDetailId,
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

describe("selectStoreDetailId", () => {
  it("未選択または別店舗のときは、押した店舗の詳細パネルをONにする", () => {
    expect(selectStoreDetailId(null, "store-a")).toBe("store-a");
    expect(selectStoreDetailId("store-b", "store-a")).toBe("store-a");
  });

  it("詳細パネルがONの店舗を再度押しても閉じず、同じ店舗を表示し続ける", () => {
    expect(selectStoreDetailId("store-a", "store-a")).toBe("store-a");
  });
});

describe("hasMapCenterMoved", () => {
  it("80m以上中心が変わったときだけ再検索候補にする", () => {
    expect(
      hasMapCenterMoved(
        { lat: 35.6717, lng: 139.7639 },
        { lat: 35.67175, lng: 139.76395 },
      ),
    ).toBe(false);

    expect(
      hasMapCenterMoved(
        { lat: 35.6717, lng: 139.7639 },
        { lat: 35.6727, lng: 139.7639 },
      ),
    ).toBe(true);
  });
});
