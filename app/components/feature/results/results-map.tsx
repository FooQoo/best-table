import type { Restaurant } from "~/domain/models/restaurant";
import { RestaurantMap } from "~/components/feature/maps/restaurant-map";

type ResultsMapProps = {
  stores: Restaurant[];
  activeStoreId?: string | null;
  onMarkerClick?: (storeId: string) => void;
};

export function ResultsMap({
  stores,
  activeStoreId,
  onMarkerClick,
}: ResultsMapProps) {
  return (
    <div className="h-full flex-1 relative overflow-hidden bg-[#e9e4d6]">
      <div className="absolute top-4 right-4 z-10 text-[11px] font-mono text-[#8a8474] bg-[#f7f4ee]/90 border border-[#ddd4c2] rounded px-2 py-1">
        地図エリア
      </div>
      <RestaurantMap
        restaurants={stores}
        activeRestaurantId={activeStoreId}
        onMarkerClick={onMarkerClick}
      />
    </div>
  );
}
