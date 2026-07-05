import type { Restaurant } from "~/domain/models/restaurant";

export type MappableRestaurant = Restaurant & {
  location: { lat: number; lng: number };
};

export type MapCamera = {
  center: { lat: number; lng: number };
  zoom: number;
};

export function getMappableRestaurants(
  restaurants: Restaurant[],
): MappableRestaurant[] {
  return restaurants.filter(
    (restaurant): restaurant is MappableRestaurant => restaurant.location !== null,
  );
}

export function getInitialMapCamera(
  restaurants: MappableRestaurant[],
): MapCamera {
  if (restaurants.length === 0) {
    return { center: { lat: 35.672176, lng: 139.765022 }, zoom: 13 };
  }

  const lats = restaurants.map((restaurant) => restaurant.location.lat);
  const lngs = restaurants.map((restaurant) => restaurant.location.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const span = Math.max(latSpan, lngSpan);

  return {
    center: {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    },
    zoom: span < 0.01 ? 15 : span < 0.04 ? 13 : 12,
  };
}
