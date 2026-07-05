import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import type { Restaurant } from "~/domain/models/restaurant";
import { MIN_COMPARE_COUNT } from "~/domain/models/restaurant";
import { useBooking } from "~/state/booking-context";
import { PRIORITIES } from "~/mocks/data";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";
import { ComparePanel } from "~/components/feature/results/compare-panel";
import { CompareTray } from "~/components/feature/results/compare-tray";
import { ResultsMap } from "~/components/feature/results/results-map";
import { ResultsSummaryBar } from "~/components/feature/results/results-summary-bar";
import { StoreDetailPanel } from "~/components/feature/results/store-detail-panel";
import {
  StoreList,
  type StoreListScrollTarget,
} from "~/components/feature/results/store-list";
import {
  StoreListSkeleton,
  StoreListSkeletonItems,
} from "~/components/feature/results/store-list-skeleton";

const PAGE_SIZE = 10;

type SearchResponse = {
  restaurants: Restaurant[];
  fromCache: boolean;
  hasMore: boolean;
  nextOffset: number | null;
};

type FetchMode = "initial" | "more";

export function canRequestMoreResults(input: {
  isLoadingMore: boolean;
  hasMore: boolean;
  nextOffset: number | null;
}): boolean {
  return input.hasMore && !input.isLoadingMore && input.nextOffset !== null;
}

export function ResultsScreen() {
  const navigate = useNavigate();
  const {
    state,
    toggleCompare,
    resetForNewChat,
    setRestaurants,
    appendRestaurants,
  } = useBooking();
  const fetcher = useFetcher<SearchResponse>();
  const hasSubmittedRef = useRef(false);
  const pendingModeRef = useRef<FetchMode>("initial");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<StoreListScrollTarget | null>(
    null,
  );
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const handleMarkerClick = useCallback((storeId: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreId(storeId);
    setScrollTarget({ storeId });
  }, []);

  const handleSelectStore = useCallback((storeId: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreId(storeId);
  }, []);

  const buildCondition = useCallback(
    (): RestaurantSearchQueryCondition => ({
      selectedAreas: state.selectedAreas,
      date: state.date,
      time: state.time,
      people: state.people,
      budgetMin: state.budgetMin,
      budgetMax: state.budgetMax,
      budgetOtherOn: state.budgetOtherOn,
      budgetOtherText: state.budgetOtherText,
      priorities: state.priorities,
      priorityOtherOn: state.priorityOtherOn,
      priorityOtherText: state.priorityOtherText,
      counterpart: state.counterpart,
      counterpartOtherText: state.counterpartOtherText,
    }),
    [
      state.selectedAreas,
      state.date,
      state.time,
      state.people,
      state.budgetMin,
      state.budgetMax,
      state.budgetOtherOn,
      state.budgetOtherText,
      state.priorities,
      state.priorityOtherOn,
      state.priorityOtherText,
      state.counterpart,
      state.counterpartOtherText,
    ],
  );

  const chatBookingSummary: ResultsChatBookingSummary = {
    selectedAreas: state.selectedAreas,
    date: state.date,
    time: state.time,
    people: state.people,
    budgetMin: state.budgetMin,
    budgetMax: state.budgetMax,
    budgetOtherOn: state.budgetOtherOn,
    budgetOtherText: state.budgetOtherText,
    priorities: state.priorities,
    priorityOtherOn: state.priorityOtherOn,
    priorityOtherText: state.priorityOtherText,
    counterpart: state.counterpart,
    counterpartOtherText: state.counterpartOtherText,
  };

  const submitSearch = useCallback(
    (mode: FetchMode, offset: number) => {
      pendingModeRef.current = mode;
      setLoadMoreError(null);
      fetcher.submit(JSON.stringify({ ...buildCondition(), limit: PAGE_SIZE, offset }), {
        method: "post",
        action: "/api/restaurants/search",
        encType: "application/json",
      });
    },
    [buildCondition, fetcher],
  );

  useEffect(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    submitSearch("initial", 0);
    // 検索条件は /hearing 経由でのみ変わり、この画面滞在中は変わらないため初回のみ実行する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fetcher.data) return;

    if (pendingModeRef.current === "initial") {
      setRestaurants(fetcher.data.restaurants);
    } else {
      appendRestaurants(fetcher.data.restaurants);
    }
    setHasMore(fetcher.data.hasMore);
    setNextOffset(fetcher.data.nextOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data]);

  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      pendingModeRef.current === "more" &&
      fetcher.data &&
      fetcher.data.restaurants.length === 0 &&
      fetcher.data.hasMore
    ) {
      setLoadMoreError("追加の店舗を取得できませんでした。");
    }
  }, [fetcher.data, fetcher.state]);

  const isInitialSearching =
    pendingModeRef.current === "initial" && !fetcher.data && fetcher.state !== "idle";
  const isLoadingMore =
    pendingModeRef.current === "more" && fetcher.state !== "idle";
  const hasSearched = Boolean(fetcher.data);

  const loadMore = useCallback(() => {
    if (!canRequestMoreResults({ isLoadingMore, hasMore, nextOffset })) return;
    if (nextOffset === null) return;
    submitSearch("more", nextOffset);
  }, [hasMore, isLoadingMore, nextOffset, submitSearch]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || nextOffset === null) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, nextOffset]);

  const priorityLabelByKey = Object.fromEntries(
    PRIORITIES.map((p) => [p.key, p.label]),
  );
  const recapKeyword = state.selectedAreas.length
    ? state.selectedAreas.join("・")
    : "エリア未指定";
  const recapDateTime = `${state.date} ${state.time}`;
  const recapBudget =
    state.budgetMin !== "指定なし" || state.budgetMax !== "指定なし"
      ? `${state.budgetMin} 〜 ${state.budgetMax}`
      : state.budgetOtherOn && state.budgetOtherText.trim()
        ? state.budgetOtherText
        : "指定なし";
  const recapPriorities = state.priorities.length
    ? state.priorities.map((k) => priorityLabelByKey[k]).join("・")
    : state.counterpart
      ? "指定なし"
      : "未ヒアリング";

  const sortedStores = [...state.restaurants].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );
  const selectedStore =
    sortedStores.find((store) => store.id === selectedStoreId) ?? null;
  const compareCount = state.compareIds.length;
  const canCompare = compareCount >= MIN_COMPARE_COUNT;
  const compareStores = sortedStores.filter((store) =>
    state.compareIds.includes(store.id),
  );

  const changeConditions = () => {
    resetForNewChat();
    navigate("/");
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden box-border">
      <ResultsSummaryBar
        recapKeyword={recapKeyword}
        recapDateTime={recapDateTime}
        people={state.people}
        recapBudget={recapBudget}
        recapPriorities={recapPriorities}
        onChangeConditions={changeConditions}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {isInitialSearching ? (
          <>
            <StoreListSkeleton />
            <ResultsMap stores={[]} bookingSummary={chatBookingSummary} />
          </>
        ) : hasSearched && sortedStores.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#79726a] text-sm">
            <div>条件に合う店舗が見つかりませんでした。</div>
            <button
              type="button"
              onClick={changeConditions}
              className="text-[13px] text-[#8a6a1a] underline bg-transparent border-none cursor-pointer"
            >
              条件を変更する
            </button>
          </div>
        ) : (
          <>
            <StoreList
              stores={sortedStores}
              compareIds={state.compareIds}
              onToggleCompare={toggleCompare}
              counterpartId={state.counterpart}
              activeStoreId={activeStoreId}
              onActivateStore={setActiveStoreId}
              onSelectStore={handleSelectStore}
              scrollTarget={scrollTarget}
              footer={
                <>
                  {isLoadingMore && <StoreListSkeletonItems count={3} />}
                  {loadMoreError && (
                    <div className="flex flex-col gap-2 text-[13px] text-[#79726a]">
                      <div>{loadMoreError}</div>
                      <button
                        type="button"
                        onClick={loadMore}
                        className="self-start text-[#8a6a1a] underline bg-transparent border-none cursor-pointer"
                      >
                        もう一度読み込む
                      </button>
                    </div>
                  )}
                  <div ref={loadMoreRef} data-testid="results-load-more-sentinel" />
                </>
              }
            />
            <div className="relative min-w-0 flex-1">
              <ResultsMap
                stores={sortedStores}
                bookingSummary={chatBookingSummary}
                activeStoreId={activeStoreId}
                onMarkerClick={handleMarkerClick}
              />
              {selectedStore && (
                <StoreDetailPanel
                  store={selectedStore}
                  onClose={() => setSelectedStoreId(null)}
                />
              )}
              {isCompareOpen && (
                <ComparePanel
                  stores={compareStores}
                  counterpartId={state.counterpart}
                />
              )}
            </div>
          </>
        )}
      </div>

      <CompareTray
        compareCount={compareCount}
        canCompare={canCompare}
        isCompareOpen={isCompareOpen}
        onToggleCompare={() =>
          canCompare && setIsCompareOpen((open) => !open)
        }
      />
    </div>
  );
}
