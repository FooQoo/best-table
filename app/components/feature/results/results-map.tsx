import type { MatchTier, Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import { RestaurantMap } from "~/components/feature/maps/restaurant-map";
import { MatchTierLegend } from "~/components/feature/maps/match-tier-legend";
import { ResultsAiChat } from "~/components/feature/results/results-ai-chat";

type ResultsMapProps = {
  stores: Restaurant[];
  bookingSummary: ResultsChatBookingSummary;
  activeStoreId?: string | null;
  onMarkerClick?: (storeId: string) => void;
  onCenterChanged?: (center: { lat: number; lng: number }) => void;
  showSearchThisArea?: boolean;
  onSearchThisArea?: () => void;
  hiddenTiers: ReadonlySet<MatchTier>;
  onToggleTier: (tier: MatchTier) => void;
};

export function ResultsMap({
  stores,
  bookingSummary,
  activeStoreId,
  onMarkerClick,
  onCenterChanged,
  showSearchThisArea = false,
  onSearchThisArea,
  hiddenTiers,
  onToggleTier,
}: ResultsMapProps) {
  const hasEvaluatedStore = stores.some((store) => store.matchTier !== null);

  return (
    <div className="h-full flex-1 relative overflow-hidden bg-[#e9e4d6]">
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div className="text-[11px] font-mono text-[#8a8474] bg-[#f7f4ee]/90 border border-[#ddd4c2] rounded px-2 py-1">
          地図エリア
        </div>
        {hasEvaluatedStore && (
          <MatchTierLegend hiddenTiers={hiddenTiers} onToggleTier={onToggleTier} />
        )}
      </div>
      <RestaurantMap
        restaurants={stores}
        activeRestaurantId={activeStoreId}
        onMarkerClick={onMarkerClick}
        onCenterChanged={onCenterChanged}
        hiddenTiers={hiddenTiers}
      />
      {showSearchThisArea && (
        <button
          type="button"
          onClick={onSearchThisArea}
          className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#d8d1c4] bg-white px-4 py-2 text-[13px] font-bold text-[#2f2d28] shadow-[0_3px_12px_rgba(0,0,0,.18)] transition hover:bg-[#f7f4ee] focus:outline-none focus:ring-2 focus:ring-[#2f5f72]"
        >
          このエリアを検索
        </button>
      )}
      <ResultsAiChat stores={stores} bookingSummary={bookingSummary} />
    </div>
  );
}
