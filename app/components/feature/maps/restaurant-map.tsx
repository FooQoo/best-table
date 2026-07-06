import { APIProvider, Map } from "@vis.gl/react-google-maps";
import type { Restaurant } from "~/domain/models/restaurant";
import { GOLD } from "~/mocks/data";
import { GenreMarkerOverlay } from "./genre-marker-overlay";
import {
  getInitialMapCamera,
  getMappableRestaurants,
} from "./restaurant-map-utils";

export const DEFAULT_MARKER_COLOR = "#d93025";

type RestaurantMapProps = {
  restaurants: Restaurant[];
  activeRestaurantId?: string | null;
  onMarkerClick?: (restaurantId: string) => void;
  emptyLabel?: string;
  apiKey?: string | null;
};

// 飲食店・小売など、AI が探して比較する対象と紛らわしい既存施設の POI は隠す。
// 駅（transit）や美術館などのランドマーク（poi.attraction）は残す。
// featureType 未指定で全 elementType（デフォルト "all"）に効くため、labels 系を個別指定する必要はない。
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
];

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
        styles={MAP_STYLES}
        style={{ width: "100%", height: "100%" }}
      >
        {mappableRestaurants.map((restaurant) => {
          const isActive = restaurant.id === activeRestaurantId;
          const width = isActive ? 32 : 28;
          const height = isActive ? 42 : 36;
          return (
            <GenreMarkerOverlay
              key={restaurant.id}
              position={restaurant.location}
              title={restaurant.name}
              zIndex={isActive ? 2 : 1}
              onClick={() => onMarkerClick?.(restaurant.id)}
            >
              <div className="relative" style={{ width, height }}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 28 36"
                  width={width}
                  height={height}
                  className="block drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]"
                >
                  <path
                    d="M14 35C10.1 29.3 4 22.5 4 14.2C4 8 8.5 3 14 3S24 8 24 14.2C24 22.5 17.9 29.3 14 35Z"
                    fill={isActive ? GOLD : DEFAULT_MARKER_COLOR}
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle cx="14" cy="14" r="5" fill="#ffffff" opacity="0.95" />
                </svg>
                <span
                  className="absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-bold shadow-sm"
                  style={{
                    left: width + 6,
                    top: 6,
                    background: isActive ? GOLD : "#ffffff",
                    color: "#20201c",
                  }}
                >
                  {restaurant.name}
                </span>
              </div>
            </GenreMarkerOverlay>
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
