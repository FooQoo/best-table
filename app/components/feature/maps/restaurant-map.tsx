import { useEffect } from "react";
import {
  APIProvider,
  Map,
  useMap,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import type { Restaurant } from "~/domain/models/restaurant";
import { NAVY } from "~/mocks/data";
import { GenreMarkerOverlay } from "./genre-marker-overlay";
import {
  resolveTierColor,
  resolveTierFilterKey,
  type TierFilterKey,
} from "./match-tier-colors";
import {
  getInitialMapCamera,
  getMappableRestaurants,
  type MappableRestaurant,
} from "./restaurant-map-utils";

type RestaurantMapProps = {
  restaurants: Restaurant[];
  activeRestaurantId?: string | null;
  onMarkerClick?: (restaurantId: string) => void;
  onCenterChanged?: (center: { lat: number; lng: number }) => void;
  emptyLabel?: string;
  apiKey?: string | null;
  // 絞り込みパネルで非表示にされたマッチ度（評価未生成は独立した行）のピンは地図から除く。
  hiddenTiers?: ReadonlySet<TierFilterKey>;
  // カードクリックなど、明示的に選択された店舗の位置に地図を移動させたいときだけ設定する。
  focusRestaurantId?: string | null;
};

// focusRestaurantId が変わるたびに、その店舗の位置へ地図の中心を移動する。
function MapCenterOnFocus({
  restaurants,
  focusRestaurantId,
}: {
  restaurants: MappableRestaurant[];
  focusRestaurantId?: string | null;
}) {
  const map = useMap();
  const target = restaurants.find(
    (restaurant) => restaurant.id === focusRestaurantId,
  );
  const targetLat = target?.location.lat;
  const targetLng = target?.location.lng;

  // restaurants は評価到着のたびに再生成されるため、参照ではなく実際に移動すべき
  // 座標（targetLat/targetLng）だけを依存にして、無関係な再描画で pan が中断されるのを防ぐ。
  useEffect(() => {
    if (!map || targetLat === undefined || targetLng === undefined) return;
    map.panTo({ lat: targetLat, lng: targetLng });
  }, [map, targetLat, targetLng]);

  return null;
}

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
  onCenterChanged,
  emptyLabel = "地図に表示できる店舗がありません",
  apiKey: apiKeyOverride,
  hiddenTiers,
  focusRestaurantId,
}: RestaurantMapProps) {
  const apiKey = apiKeyOverride === undefined ? getBrowserMapsKey() : apiKeyOverride;
  const mappableRestaurants = getMappableRestaurants(restaurants).filter(
    (restaurant) => !hiddenTiers?.has(resolveTierFilterKey(restaurant.matchTier)),
  );

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
        onCameraChanged={(event: MapCameraChangedEvent) => {
          onCenterChanged?.(event.detail.center);
        }}
      >
        <MapCenterOnFocus
          restaurants={mappableRestaurants}
          focusRestaurantId={focusRestaurantId}
        />
        {mappableRestaurants.map((restaurant) => {
          const isActive = restaurant.id === activeRestaurantId;
          const width = isActive ? 32 : 28;
          const height = isActive ? 42 : 36;
          // ピンの色は常にマッチ度で塗り分ける（未評価は既定色）。色そのものを
          // マッチ度専用にするため、選択中（isActive）のシグナルは色ではなく
          // 枠線の太さ・ラベルの枠で表す。
          const fill = resolveTierColor(restaurant.matchTier);
          const strokeWidth = isActive ? "3.5" : "2";
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
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                  />
                  <circle cx="14" cy="14" r="5" fill="#ffffff" opacity="0.95" />
                </svg>
                <span
                  className="absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-bold shadow-sm"
                  style={{
                    left: width + 6,
                    top: 6,
                    background: "#ffffff",
                    color: "#20201c",
                    border: isActive ? `2px solid ${NAVY}` : undefined,
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
