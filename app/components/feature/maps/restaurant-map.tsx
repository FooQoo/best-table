import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import type { Restaurant } from "~/domain/models/restaurant";
import {
  getInitialMapCamera,
  getMappableRestaurants,
} from "./restaurant-map-utils";

type RestaurantMapProps = {
  restaurants: Restaurant[];
  activeRestaurantId?: string | null;
  onMarkerClick?: (restaurantId: string) => void;
  emptyLabel?: string;
  apiKey?: string | null;
};

function getBrowserMapsKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
}

export function RestaurantMap({
  restaurants,
  activeRestaurantId,
  onMarkerClick,
  emptyLabel = "地図に表示できる店舗がありません",
  apiKey: apiKeyOverride,
}: RestaurantMapProps) {
  const apiKey = apiKeyOverride === undefined ? getBrowserMapsKey() : apiKeyOverride;
  const mappableRestaurants = getMappableRestaurants(restaurants);

  if (mappableRestaurants.length === 0) {
    return <MapFallback message={emptyLabel} />;
  }

  if (!apiKey) {
    return (
      <MapFallback message="Google Maps のブラウザ用キーが未設定です" />
    );
  }

  const camera = getInitialMapCamera(mappableRestaurants);

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={camera.center}
        defaultZoom={camera.zoom}
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: "100%", height: "100%" }}
      >
        {mappableRestaurants.map((restaurant) => {
          const isActive = restaurant.id === activeRestaurantId;
          return (
            <Marker
              key={restaurant.id}
              position={restaurant.location}
              title={restaurant.name}
              label={{
                text:
                  restaurant.score === null
                    ? isActive
                      ? "●"
                      : " "
                    : `${isActive ? "●" : ""}${restaurant.score}`,
                color: "#20201c",
                fontWeight: "700",
              }}
              zIndex={isActive ? 2 : 1}
              onClick={() => onMarkerClick?.(restaurant.id)}
            />
          );
        })}
      </Map>
    </APIProvider>
  );
}

function MapFallback({ message }: { message: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-[#e9e4d6] text-[#79726a] text-sm">
      {message}
    </div>
  );
}
