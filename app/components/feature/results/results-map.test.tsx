import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { useState } from "react";
import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import type { TierFilterKey } from "~/components/feature/maps/match-tier-colors";
import type { CompareVisibilityGroup } from "~/components/feature/maps/map-filter-panel";
import { ResultsMap } from "./results-map";

vi.mock("~/components/feature/maps/restaurant-map", () => ({
  RestaurantMap: ({
    restaurants,
    hiddenTiers,
    onCenterChanged,
    emptyLabel,
  }: {
    restaurants: Restaurant[];
    hiddenTiers?: Set<string>;
    onCenterChanged?: (center: { lat: number; lng: number }) => void;
    emptyLabel?: string;
  }) => (
    <button
      type="button"
      data-testid="restaurant-map"
      data-hidden-tiers={hiddenTiers ? [...hiddenTiers].join(",") : ""}
      data-restaurant-ids={restaurants.map((r) => r.id).join(",")}
      data-empty-label={emptyLabel ?? ""}
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
      hiddenCompareGroups={new Set()}
      onToggleCompareGroup={() => {}}
      {...props}
    />,
  );
}

function ControlledResultsMap({ stores }: { stores: Restaurant[] }) {
  const [hiddenTiers, setHiddenTiers] = useState<Set<TierFilterKey>>(
    new Set(),
  );
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
      hiddenCompareGroups={new Set()}
      onToggleCompareGroup={() => {}}
    />
  );
}

function ControlledCompareResultsMap({
  stores,
  compareIds,
}: {
  stores: Restaurant[];
  compareIds: string[];
}) {
  const [hiddenCompareGroups, setHiddenCompareGroups] = useState<
    Set<CompareVisibilityGroup>
  >(new Set());
  return (
    <ResultsMap
      stores={stores}
      bookingSummary={bookingSummary}
      hiddenTiers={new Set()}
      onToggleTier={() => {}}
      compareIds={compareIds}
      hiddenCompareGroups={hiddenCompareGroups}
      onToggleCompareGroup={(group) =>
        setHiddenCompareGroups((prev) => {
          const next = new Set(prev);
          if (next.has(group)) next.delete(group);
          else next.add(group);
          return next;
        })
      }
    />
  );
}

describe("ResultsMap", () => {
  it("shows the match-tier and compare sections from the start, before any evaluation or compare selection", () => {
    renderResultsMap();

    expect(
      screen.getByRole("button", { name: "最高0件" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "評価未生成1件" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "比較対象0件" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "比較対象外1件" }),
    ).toBeInTheDocument();
  });

  it("hides a tier's pins on the map when its filter row is clicked", async () => {
    render(
      <ControlledResultsMap stores={[buildStore({ matchTier: "high" })]} />,
    );

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-hidden-tiers",
      "",
    );

    await userEvent.click(screen.getByRole("button", { name: "高1件" }));

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-hidden-tiers",
      "high",
    );

    await userEvent.click(screen.getByRole("button", { name: "高1件" }));

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

  it("hides non-target pins on the map when '比較対象外' is unchecked", async () => {
    render(
      <ControlledCompareResultsMap
        stores={[buildStore({ id: "s1" }), buildStore({ id: "s2" })]}
        compareIds={["s1"]}
      />,
    );

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-restaurant-ids",
      "s1,s2",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "比較対象外1件" }),
    );

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-restaurant-ids",
      "s1",
    );
  });

  it("hides target pins on the map when '比較対象' is unchecked", async () => {
    render(
      <ControlledCompareResultsMap
        stores={[buildStore({ id: "s1" }), buildStore({ id: "s2" })]}
        compareIds={["s1"]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "比較対象1件" }));

    expect(screen.getByTestId("restaurant-map")).toHaveAttribute(
      "data-restaurant-ids",
      "s2",
    );
  });
});
