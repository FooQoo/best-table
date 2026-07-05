import { act, render, renderHook, screen } from "@testing-library/react";
import { STORES } from "~/mocks/data";
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

  it("相手種別を設定すると取得できる", () => {
    const { result } = setup();

    act(() => {
      result.current.setCounterpart("important-client");
    });

    expect(result.current.state.counterpart).toBe("important-client");
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

    expect(result.current.state.restaurants.map((restaurant) => restaurant.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it("重視条件を更新すると /hearing → /results → /compare 相当の画面遷移でも保持される", () => {
    // BookingProvider は root.tsx でアプリ全体に1つだけマウントされるため、
    // 画面遷移は「Provider 配下で子コンポーネントが差し替わる」ことに相当する。
    function HearingScreenStub() {
      const { togglePriority } = useBooking();
      return (
        <button
          type="button"
          onClick={() => togglePriority("quietness")}
        >
          hearing
        </button>
      );
    }
    function ResultsScreenStub() {
      const { state } = useBooking();
      return <div data-testid="priorities">{state.priorities.join(",")}</div>;
    }
    function CompareScreenStub() {
      const { state } = useBooking();
      return <div data-testid="priorities">{state.priorities.join(",")}</div>;
    }

    const { rerender } = render(
      <BookingProvider>
        <HearingScreenStub />
      </BookingProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "hearing" }).click();
    });

    rerender(
      <BookingProvider>
        <ResultsScreenStub />
      </BookingProvider>,
    );
    expect(screen.getByTestId("priorities").textContent).toBe("quietness");

    rerender(
      <BookingProvider>
        <CompareScreenStub />
      </BookingProvider>,
    );
    expect(screen.getByTestId("priorities").textContent).toBe("quietness");
  });
});
