import { act, renderHook } from "@testing-library/react";
import { STORES } from "~/mocks/data";
import { BookingProvider, useBooking } from "./booking-context";

// BookingProvider は毎回新しい Jotai store を作るため、テストごとに状態は独立している。
function setup() {
  return renderHook(() => useBooking(), { wrapper: BookingProvider });
}

describe("useBooking", () => {
  it("toggleCompare は呼ぶたびに追加・削除をトグルする", () => {
    const { result } = setup();

    act(() => {
      result.current.toggleCompare("1");
    });
    expect(result.current.state.compareIds).toEqual(["1"]);

    act(() => {
      result.current.toggleCompare("2");
    });
    expect(result.current.state.compareIds).toEqual(["1", "2"]);

    act(() => {
      result.current.toggleCompare("1");
    });
    expect(result.current.state.compareIds).toEqual(["2"]);
  });

  it("toggleCompare は5件を超えて追加できない", () => {
    const { result } = setup();

    act(() => {
      ["1", "2", "3", "4", "5", "6"].forEach((id) =>
        result.current.toggleCompare(id),
      );
    });

    expect(result.current.state.compareIds).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("resetForNewChat は比較状態と店舗一覧を初期化する", () => {
    const { result } = setup();

    act(() => {
      result.current.toggleCompare("1");
      result.current.setRestaurants(STORES);
    });

    act(() => {
      result.current.resetForNewChat();
    });

    expect(result.current.state.compareIds).toEqual([]);
    expect(result.current.state.restaurants).toEqual([]);
  });

  it("appendRestaurants は既存の店舗を維持して新しい店舗だけ追記する", () => {
    const { result } = setup();
    const first = STORES[0];
    const second = STORES[1];

    act(() => {
      result.current.setRestaurants([first]);
    });
    act(() => {
      result.current.appendRestaurants([first, second]);
    });

    expect(
      result.current.state.restaurants.map((restaurant) => restaurant.id),
    ).toEqual([first.id, second.id]);
  });

  it("appendRestaurants は placeId が同じ店舗を重複追加しない", () => {
    const { result } = setup();
    const first = { ...STORES[0], id: "first-id", placeId: "places/same" };
    const duplicate = { ...STORES[0], id: "second-id", placeId: "places/same" };
    const second = { ...STORES[1], id: "third-id", placeId: "places/other" };

    act(() => {
      result.current.setRestaurants([first]);
    });
    act(() => {
      result.current.appendRestaurants([duplicate, second]);
    });

    expect(
      result.current.state.restaurants.map((restaurant) => restaurant.id),
    ).toEqual(["first-id", "third-id"]);
  });

  it("appendRestaurants は placeId がない場合も店名と住所で重複追加を避ける", () => {
    const { result } = setup();
    const first = {
      ...STORES[0],
      id: "first-id",
      placeId: null,
      name: "同じ店",
      address: "東京都中央区銀座1-1-1",
    };
    const duplicate = { ...first, id: "second-id" };
    const second = { ...STORES[1], id: "third-id", placeId: null };

    act(() => {
      result.current.setRestaurants([first]);
    });
    act(() => {
      result.current.appendRestaurants([duplicate, second]);
    });

    expect(
      result.current.state.restaurants.map((restaurant) => restaurant.id),
    ).toEqual(["first-id", "third-id"]);
  });

  it("updateRestaurant は同じ id の店舗だけを差し替える（並び順は維持）", () => {
    const { result } = setup();
    const first = STORES[0];
    const second = STORES[1];

    act(() => {
      result.current.setRestaurants([first, second]);
    });
    act(() => {
      result.current.updateRestaurant({ ...first, matchTier: "highest" });
    });

    expect(
      result.current.state.restaurants.map((restaurant) => restaurant.id),
    ).toEqual([first.id, second.id]);
    expect(result.current.state.restaurants[0].matchTier).toBe("highest");
    expect(result.current.state.restaurants[1]).toEqual(second);
  });
});
