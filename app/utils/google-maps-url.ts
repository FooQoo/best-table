import type { Restaurant } from "~/domain/models/restaurant";

export function buildGoogleMapsUrl(store: Restaurant): string {
  if (store.placeId) {
    const placeId = store.placeId.replace(/^places\//, "");
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  }

  const query = [store.name, store.address ?? store.area]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
