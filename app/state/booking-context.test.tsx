import { act, renderHook } from "@testing-library/react";
import { BookingProvider, useBooking } from "./booking-context";

// BookingProvider は毎回新しい Jotai store を作るため、テストごとに状態は独立している。
function setup() {
  return renderHook(() => useBooking(), { wrapper: BookingProvider });
}

describe("useBooking", () => {
  it("togglePriority は3件を超えて追加できない", () => {
    const { result } = setup();

    act(() => {
      result.current.togglePriority("a");
      result.current.togglePriority("b");
      result.current.togglePriority("c");
      result.current.togglePriority("d");
    });

    expect(result.current.state.priorities).toEqual(["a", "b", "c"]);
  });

  it("togglePriority は選択済みのキーを外せる", () => {
    const { result } = setup();

    act(() => {
      result.current.togglePriority("a");
      result.current.togglePriority("a");
    });

    expect(result.current.state.priorities).toEqual([]);
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

  it("resetForNewChat は相手種別・重視条件・比較状態を初期化する", () => {
    const { result } = setup();

    act(() => {
      result.current.setCounterpart("important-client");
      result.current.togglePriority("a");
      result.current.toggleCompare("1");
    });

    act(() => {
      result.current.resetForNewChat();
    });

    expect(result.current.state.counterpart).toBeNull();
    expect(result.current.state.priorities).toEqual([]);
    expect(result.current.state.compareIds).toEqual([]);
  });
});
