import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { DEFAULT_MARKER_COLOR, RestaurantMap } from "./restaurant-map";

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
  score: 90,
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

  it("renders unspecified markers in red", () => {
    const { container } = render(
      <RestaurantMap restaurants={[restaurant]} apiKey="test-key" />,
    );

    expect(screen.getByTitle("地図テスト店")).toBeInTheDocument();
    expect(container.querySelector(`path[fill="${DEFAULT_MARKER_COLOR}"]`)).not.toBeNull();
  });
});
