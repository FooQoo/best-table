import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MatchTierLegend } from "./match-tier-legend";

describe("MatchTierLegend", () => {
  it("shows exactly the four match tiers (evaluated-unknown is folded into 'low')", () => {
    render(<MatchTierLegend hiddenTiers={new Set()} onToggleTier={vi.fn()} />);

    expect(screen.getByRole("button", { name: "最高" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "高" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "中" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "低" })).toBeInTheDocument();
    expect(screen.queryByText("評価未生成")).not.toBeInTheDocument();
  });

  it("marks a row as pressed (visible) by default and not pressed when hidden", () => {
    render(
      <MatchTierLegend hiddenTiers={new Set(["low"])} onToggleTier={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "最高" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "低" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onToggleTier with the clicked tier", async () => {
    const onToggleTier = vi.fn();
    render(<MatchTierLegend hiddenTiers={new Set()} onToggleTier={onToggleTier} />);

    await userEvent.click(screen.getByRole("button", { name: "高" }));

    expect(onToggleTier).toHaveBeenCalledWith("high");
  });
});
