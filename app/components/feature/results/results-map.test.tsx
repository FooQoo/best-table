import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { useState } from "react";
import type { MatchTier, Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import { ResultsMap } from "./results-map";

vi.mock("~/components/feature/maps/restaurant-map", () => ({
  RestaurantMap: ({
    hiddenTiers,
    onCenterChanged,
  }: {
    hiddenTiers?: Set<string>;
    onCenterChanged?: (center: { lat: number; lng: number }) => void;
  }) => (
    <button
      type="button"
      data-testid="restaurant-map"
      data-hidden-tiers={hiddenTiers ? [...hiddenTiers].join(",") : ""}
      onClick={() => onCenterChanged?.({ lat: 35.67, lng: 139.76 })}
    />
  ),
}));

vi.mock("~/components/feature/results/results-ai-chat", () => ({
  ResultsAiChat: () => <div data-testid="results-ai-chat" />,
}));

const bookingSummary: ResultsChatBookingSummary = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "指定なし",
  budgetMax: "指定なし",
  budgetOtherOn: false,
  budgetOtherText: "",
  priorities: [],
  priorityOtherOn: false,
  priorityOtherText: "",
  counterpart: null,
  counterpartOtherText: "",
};

function buildStore(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: "s1",
    placeId: null,
    name: "テスト店",
    genre: null,
    area: "銀座",
    address: null,
    location: null,
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
    ikyu: null,
    ...overrides,
  };
}

function renderResultsMap(
  props: Partial<Parameters<typeof ResultsMap>[0]> = {},
) {
  return render(
    <ResultsMap
      stores={[buildStore()]}
      bookingSummary={bookingSummary}
      hiddenTiers={new Set()}
      onToggleTier={() => {}}
      {...props}
    />,
  );
}

function ControlledResultsMap({ stores }: { stores: Restaurant[] }) {
  const [hiddenTiers, setHiddenTiers] = useState<Set<MatchTier>>(new Set());
  return (
    <ResultsMap
      stores={stores}
      bookingSummary={bookingSummary}
      hiddenTiers={hiddenTiers}
      onToggleTier={(tier) =>
        setHiddenTiers((prev) => {
          const next = new Set(prev);
          if (next.has(tier)) next.delete(tier);
          else next.add(tier);
          return next;
        })
      }
    />
  );
}

describe("ResultsMap", () => {
  it("does not show the legend while no restaurant has been evaluated yet", () => {
    renderResultsMap();

    expect(screen.queryByRole("button", { name: "最高" })).not.toBeInTheDocument();
  });

  it("shows the legend automatically once a restaurant's evaluation arrives", () => {
    const { rerender } = renderResultsMap();

    rerender(
      <ResultsMap
        stores={[buildStore({ matchTier: "high" })]}
        bookingSummary={bookingSummary}
        hiddenTiers={new Set()}
        onToggleTier={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "最高" })).toBeInTheDocument();
  });

  it("hides a tier's pins on the map when its legend row is clicked", async () => {
    render(
      <ControlledResultsMap stores={[buildStore({ matchTier: "high" })]} />,
    );

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-hidden-tiers",
      "",
    );

    await userEvent.click(screen.getByRole("button", { name: "高" }));

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-hidden-tiers",
      "high",
    );

    await userEvent.click(screen.getByRole("button", { name: "高" }));

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-hidden-tiers",
      "",
    );
  });

  it("shows the search-this-area button over the map when requested", async () => {
    const onSearchThisArea = vi.fn();
    renderResultsMap({ showSearchThisArea: true, onSearchThisArea });

    await userEvent.click(
      screen.getByRole("button", { name: "このエリアを検索" }),
    );

    expect(onSearchThisArea).toHaveBeenCalledTimes(1);
  });

  it("passes map center changes to the results screen", async () => {
    const onCenterChanged = vi.fn();
    renderResultsMap({ onCenterChanged });

    await userEvent.click(screen.getByTestId("restaurant-map"));

    expect(onCenterChanged).toHaveBeenCalledWith({ lat: 35.67, lng: 139.76 });
  });
});
