import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import { RestaurantMap } from "~/components/feature/maps/restaurant-map";
import type { TierFilterKey } from "~/components/feature/maps/match-tier-colors";
import {
  MapFilterPanel,
  type CompareVisibilityGroup,
} from "~/components/feature/maps/map-filter-panel";
import { ResultsAiChat } from "~/components/feature/results/results-ai-chat";
import { Z_INDEX } from "~/styles/z-index";

type ResultsMapProps = {
  stores: Restaurant[];
  bookingSummary: ResultsChatBookingSummary;
  activeStoreId?: string | null;
  focusStoreId?: string | null;
  onMarkerClick?: (storeId: string) => void;
  onCenterChanged?: (center: { lat: number; lng: number }) => void;
  showSearchThisArea?: boolean;
  onSearchThisArea?: () => void;
  hiddenTiers: ReadonlySet<TierFilterKey>;
  onToggleTier: (tier: TierFilterKey) => void;
  compareIds?: string[];
  hiddenCompareGroups: ReadonlySet<CompareVisibilityGroup>;
  onToggleCompareGroup: (group: CompareVisibilityGroup) => void;
};

export function ResultsMap({
  stores,
  bookingSummary,
  activeStoreId,
  focusStoreId,
  onMarkerClick,
  onCenterChanged,
  showSearchThisArea = false,
  onSearchThisArea,
  hiddenTiers,
  onToggleTier,
  compareIds = [],
  hiddenCompareGroups,
  onToggleCompareGroup,
}: ResultsMapProps) {
  const mapStores = stores.filter((store) => {
    const group: CompareVisibilityGroup = compareIds.includes(store.id)
      ? "target"
      : "excluded";
    return !hiddenCompareGroups.has(group);
  });
  const isFilteredEmpty = stores.length > 0 && mapStores.length === 0;

  return (
    <div className="h-full flex-1 relative overflow-hidden bg-[#e9e4d6]">
      <div
        className={`absolute top-4 right-4 ${Z_INDEX.mapControls} flex flex-col items-end gap-2`}
      >
        <div className="text-[11px] font-mono text-[#8a8474] bg-[#f7f4ee]/90 border border-[#ddd4c2] rounded px-2 py-1">
          地図エリア
        </div>
        <MapFilterPanel
          restaurants={stores}
          hiddenTiers={hiddenTiers}
          onToggleTier={onToggleTier}
          compareIds={compareIds}
          hiddenCompareGroups={hiddenCompareGroups}
          onToggleCompareGroup={onToggleCompareGroup}
        />
      </div>
      <RestaurantMap
        restaurants={mapStores}
        activeRestaurantId={activeStoreId}
        focusRestaurantId={focusStoreId}
        onMarkerClick={onMarkerClick}
        onCenterChanged={onCenterChanged}
        hiddenTiers={hiddenTiers}
        emptyLabel={isFilteredEmpty ? "絞り込み条件に一致する店舗がありません" : undefined}
      />
      {showSearchThisArea && (
        <button
          type="button"
          onClick={onSearchThisArea}
          className={`absolute top-4 left-1/2 ${Z_INDEX.mapActionButton} -translate-x-1/2 rounded-full border border-[#d8d1c4] bg-white px-4 py-2 text-[13px] font-bold text-[#2f2d28] shadow-[0_3px_12px_rgba(0,0,0,.18)] transition hover:bg-[#f7f4ee] focus:outline-none focus:ring-2 focus:ring-[#2f5f72]`}
        >
          このエリアを検索
        </button>
      )}
      <ResultsAiChat stores={stores} bookingSummary={bookingSummary} />
    </div>
  );
}
