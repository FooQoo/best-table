import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import { getInitialMapCamera, getMappableRestaurants } from "./restaurant-map-utils";

const baseRestaurant: Restaurant = {
  id: "r1",
  placeId: null,
  name: "テスト店",
  genre: null,
  area: "銀座",
  address: null,
  location: null,
  phone: null,
  photoUrl: null,
  score: null,
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

describe("getMappableRestaurants", () => {
  it("keeps only restaurants with real coordinates", () => {
    const restaurants = [
      baseRestaurant,
      { ...baseRestaurant, id: "r2", location: { lat: 35.67, lng: 139.76 } },
    ];

    expect(getMappableRestaurants(restaurants).map((restaurant) => restaurant.id)).toEqual([
      "r2",
    ]);
  });
});

describe("getInitialMapCamera", () => {
  it("centers the map around the available restaurant coordinates", () => {
    const camera = getInitialMapCamera([
      { ...baseRestaurant, id: "r1", location: { lat: 35.66, lng: 139.72 } },
      { ...baseRestaurant, id: "r2", location: { lat: 35.68, lng: 139.78 } },
    ]);

    expect(camera.center).toEqual({ lat: 35.67, lng: 139.75 });
    expect(camera.zoom).toBe(12);
  });

  it("uses a default camera when there are no mappable restaurants", () => {
    expect(getInitialMapCamera([])).toEqual({
      center: { lat: 35.672176, lng: 139.765022 },
      zoom: 13,
    });
  });
});
