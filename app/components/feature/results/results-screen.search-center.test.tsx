import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import type { Restaurant } from "~/domain/models/restaurant";
import { BookingProvider } from "~/state/booking-context";
import { ResultsScreen } from "./results-screen";

vi.mock("~/components/feature/results/results-map", () => ({
  ResultsMap: ({
    onCenterChanged,
    showSearchThisArea,
    onSearchThisArea,
  }: {
    onCenterChanged?: (center: { lat: number; lng: number }) => void;
    showSearchThisArea?: boolean;
    onSearchThisArea?: () => void;
  }) => (
    <div data-testid="results-map">
      <button
        type="button"
        onClick={() => onCenterChanged?.({ lat: 35.6717, lng: 139.7639 })}
      >
        initial center
      </button>
      <button
        type="button"
        onClick={() => onCenterChanged?.({ lat: 35.6812, lng: 139.7671 })}
      >
        moved center
      </button>
      {showSearchThisArea && (
        <button type="button" onClick={onSearchThisArea}>
          このエリアを検索
        </button>
      )}
    </div>
  ),
}));

const restaurant: Restaurant = {
  id: "places_test",
  placeId: "places/test",
  name: "テスト店",
  genre: null,
  area: "銀座",
  address: "東京都中央区銀座1-1-1",
  location: { lat: 35.6717, lng: 139.7639 },
  phone: null,
  photoUrl: null,
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

function streamResponse() {
  const encoder = new TextEncoder();
  const body = [
    { type: "restaurant", restaurant },
    { type: "done", fromCache: false, hasMore: false, nextOffset: null },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n");

  return Promise.resolve(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`${body}\n`));
          controller.close();
        },
      }),
      { status: 200 },
    ),
  );
}

function parseFetchBody(callIndex: number) {
  const init = vi.mocked(fetch).mock.calls[callIndex][1];
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ResultsScreen search center", () => {
  it("条件の再検索では直前の地図中心座標を持ち越さない", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => streamResponse());
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          "/results?areas=%E9%8A%80%E5%BA%A7&date=2026-07-15&time=19:00&people=4",
        ]}
      >
        <BookingProvider>
          <ResultsScreen />
        </BookingProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(parseFetchBody(0).searchLatLng).toBeNull();

    await user.click(screen.getByRole("button", { name: "initial center" }));
    await user.click(screen.getByRole("button", { name: "moved center" }));
    await user.click(screen.getByRole("button", { name: "このエリアを検索" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(parseFetchBody(1).searchLatLng).toEqual({
      latitude: 35.6812,
      longitude: 139.7671,
    });

    await user.click(screen.getByRole("button", { name: "条件を変更する" }));
    await user.click(
      screen.getByRole("button", { name: "条件の変更を完了する" }),
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(parseFetchBody(2).selectedAreas).toEqual(["銀座"]);
    expect(parseFetchBody(2).searchLatLng).toBeNull();
  }, 30_000);
});
