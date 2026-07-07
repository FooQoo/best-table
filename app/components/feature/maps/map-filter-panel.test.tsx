import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { MapFilterPanel } from "./map-filter-panel";

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

function renderPanel(props: Partial<Parameters<typeof MapFilterPanel>[0]> = {}) {
  return render(
    <MapFilterPanel
      restaurants={[]}
      hiddenTiers={new Set()}
      onToggleTier={vi.fn()}
      compareIds={[]}
      hiddenCompareGroups={new Set()}
      onToggleCompareGroup={vi.fn()}
      {...props}
    />,
  );
}

describe("MapFilterPanel", () => {
  it("always shows both the match-tier and compare sections, even with no data yet", () => {
    renderPanel();

    expect(
      screen.getByRole("button", { name: "最高0件" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "高0件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "中0件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "低0件" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "評価未生成0件" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "比較対象0件" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "比較対象外0件" }),
    ).toBeInTheDocument();
  });

  it("counts restaurants per match tier, keeping unevaluated separate from 'low'", () => {
    renderPanel({
      restaurants: [
        buildStore({ id: "s1", matchTier: "highest" }),
        buildStore({ id: "s2", matchTier: "highest" }),
        buildStore({ id: "s3", matchTier: "low" }),
        buildStore({ id: "s4", matchTier: null }),
      ],
    });

    expect(
      screen.getByRole("button", { name: "最高2件" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "低1件" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "評価未生成1件" }),
    ).toBeInTheDocument();
  });

  it("counts restaurants per compare visibility group", () => {
    renderPanel({
      restaurants: [
        buildStore({ id: "s1" }),
        buildStore({ id: "s2" }),
        buildStore({ id: "s3" }),
      ],
      compareIds: ["s1", "s2"],
    });

    expect(
      screen.getByRole("button", { name: "比較対象2件" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "比較対象外1件" }),
    ).toBeInTheDocument();
  });

  it("marks a row as pressed (visible) by default and not pressed when hidden", () => {
    renderPanel({ hiddenTiers: new Set(["low"]) });

    expect(screen.getByRole("button", { name: "最高0件" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "低0件" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onToggleTier with the clicked tier, including 'unevaluated'", async () => {
    const onToggleTier = vi.fn();
    renderPanel({ onToggleTier });

    await userEvent.click(screen.getByRole("button", { name: "評価未生成0件" }));

    expect(onToggleTier).toHaveBeenCalledWith("unevaluated");
  });

  it("calls onToggleCompareGroup with the clicked group", async () => {
    const onToggleCompareGroup = vi.fn();
    renderPanel({ onToggleCompareGroup });

    await userEvent.click(screen.getByRole("button", { name: "比較対象外0件" }));

    expect(onToggleCompareGroup).toHaveBeenCalledWith("excluded");
  });

  it("marks a compare row as not pressed when hidden", () => {
    renderPanel({ hiddenCompareGroups: new Set(["excluded"]) });

    expect(
      screen.getByRole("button", { name: "比較対象0件" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "比較対象外0件" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
