import type { Restaurant } from "~/domain/models/restaurant";
import type { PlaceSearchCandidate } from "~/server/clients/google-places";

type RestaurantLike = Pick<Restaurant, "placeId" | "name" | "address">;
type CandidateLike = Pick<PlaceSearchCandidate, "placeId" | "name" | "address">;

export function getRestaurantDeduplicationKey(
  restaurant: RestaurantLike | CandidateLike,
): string {
  if (restaurant.placeId) return `place:${restaurant.placeId}`;
  const name = restaurant.name.trim().toLowerCase();
  const address = restaurant.address?.trim().toLowerCase() ?? "";
  return `fallback:${name}|${address}`;
}
