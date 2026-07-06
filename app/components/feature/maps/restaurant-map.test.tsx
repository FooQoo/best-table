import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { MATCH_TIER_COLORS } from "./match-tier-colors";
import { RestaurantMap } from "./restaurant-map";

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
}));

vi.mock("./genre-marker-overlay", () => ({
  GenreMarkerOverlay: ({
    title,
    children,
  }: {
    title?: string;
    children: ReactNode;
  }) => <div title={title}>{children}</div>,
}));

const restaurant: Restaurant = {
  id: "r1",
  placeId: null,
  name: "地図テスト店",
  genre: null,
  area: "銀座",
  address: null,
  location: { lat: 35.67, lng: 139.76 },
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

describe("RestaurantMap", () => {
  it("shows a map-key fallback when the browser Google Maps key is not configured", () => {
    render(<RestaurantMap restaurants={[restaurant]} apiKey={null} />);

    expect(
      screen.getByText("Google Maps のブラウザ用キーが未設定です"),
    ).toBeInTheDocument();
  });

  it("shows an empty fallback when no restaurant has coordinates", () => {
    render(<RestaurantMap restaurants={[{ ...restaurant, location: null }]} />);

    expect(
      screen.getByText("地図に表示できる店舗がありません"),
    ).toBeInTheDocument();
  });

  it("renders an unevaluated (matchTier: null) restaurant using the 'low' tier color", () => {
    const { container } = render(
      <RestaurantMap restaurants={[restaurant]} apiKey="test-key" />,
    );

    expect(screen.getByTitle("地図テスト店")).toBeInTheDocument();
    expect(container.querySelector(`path[fill="${MATCH_TIER_COLORS.low}"]`)).not.toBeNull();
  });

  it("colors the pin by matchTier once evaluated", () => {
    const { container } = render(
      <RestaurantMap
        restaurants={[{ ...restaurant, matchTier: "highest" }]}
        apiKey="test-key"
      />,
    );

    expect(
      container.querySelector(`path[fill="${MATCH_TIER_COLORS.highest}"]`),
    ).not.toBeNull();
  });

  it("keeps the active marker visually distinct via a thicker stroke instead of color", () => {
    const { container } = render(
      <RestaurantMap
        restaurants={[{ ...restaurant, matchTier: "highest" }]}
        activeRestaurantId={restaurant.id}
        apiKey="test-key"
      />,
    );

    const path = container.querySelector("path");
    expect(path?.getAttribute("fill")).toBe(MATCH_TIER_COLORS.highest);
    expect(path?.getAttribute("stroke-width")).toBe("3.5");
  });

  it("excludes restaurants whose tier is hidden via the legend filter", () => {
    const unevaluated = restaurant; // matchTier: null -> grouped with "low"
    const visible = {
      ...restaurant,
      id: "r2",
      name: "表示される店",
      matchTier: "highest" as const,
    };

    render(
      <RestaurantMap
        restaurants={[unevaluated, visible]}
        apiKey="test-key"
        hiddenTiers={new Set(["low"])}
      />,
    );

    expect(screen.queryByTitle("地図テスト店")).not.toBeInTheDocument();
    expect(screen.getByTitle("表示される店")).toBeInTheDocument();
  });

  it("shows the empty fallback when every restaurant's tier is hidden", () => {
    render(
      <RestaurantMap
        restaurants={[restaurant]}
        apiKey="test-key"
        hiddenTiers={new Set(["low"])}
      />,
    );

    expect(
      screen.getByText("地図に表示できる店舗がありません"),
    ).toBeInTheDocument();
  });
});
