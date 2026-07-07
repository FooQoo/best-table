import { useCallback, useEffect, useRef, useState } from "react";
import type { Restaurant } from "~/domain/models/restaurant";
import type { TierFilterKey } from "~/components/feature/maps/match-tier-colors";
import { MIN_COMPARE_COUNT } from "~/domain/models/restaurant";
import { useBooking } from "~/state/booking-context";
import {
  getSearchConditionKey,
  toRestaurantSearchCondition,
  toResultsChatBookingSummary,
  useBookingQuery,
  type BookingQueryState,
} from "~/state/booking-query-state";
import { getPriorityLabel } from "~/domain/services/booking-summary-format";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import { ComparePanel } from "~/components/feature/results/compare-panel";
import { CompareTray } from "~/components/feature/results/compare-tray";
import { ResultsMap } from "~/components/feature/results/results-map";
import type { CompareVisibilityGroup } from "~/components/feature/maps/map-filter-panel";
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
import type { SearchPhase } from "~/utils/search-phase-message";
import { getRestaurantDeduplicationKey } from "~/utils/restaurant-deduplication";

const PAGE_SIZE = 10;

type FetchMode = "initial" | "more";
type MapSearchCenter = { lat: number; lng: number };
type MobileResultsView = "list" | "map";

type SearchStreamEvent =
  | { type: "phase"; phase: Exclude<SearchPhase, "condition"> }
  | { type: "restaurant"; restaurant: Restaurant }
  | { type: "restaurant-evaluated"; restaurant: Restaurant }
  | {
      type: "done";
      fromCache: boolean;
      hasMore: boolean;
      nextOffset: number | null;
    }
  | { type: "error"; message: string };

type SubmitSearchOptions = {
  excludeExistingRestaurants?: boolean;
};

export function canRequestMoreResults(input: {
  isLoadingMore: boolean;
  hasMore: boolean;
  nextOffset: number | null;
}): boolean {
  return input.hasMore && !input.isLoadingMore && input.nextOffset !== null;
}

export function toggleSelectedStoreId(
  currentStoreId: string | null,
  nextStoreId: string,
): string | null {
  return currentStoreId === nextStoreId ? null : nextStoreId;
}

export function hasMapCenterMoved(
  previous: MapSearchCenter,
  next: MapSearchCenter,
): boolean {
  const latMeters = (next.lat - previous.lat) * 111_000;
  const lngMeters =
    (next.lng - previous.lng) *
    111_000 *
    Math.cos((previous.lat * Math.PI) / 180);
  return Math.hypot(latMeters, lngMeters) >= 80;
}

function isSearchStreamEvent(value: unknown): value is SearchStreamEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  if (event.type === "phase") {
    return event.phase === "searching" || event.phase === "evaluating";
  }
  if (event.type === "restaurant" || event.type === "restaurant-evaluated") {
    return typeof event.restaurant === "object";
  }
  if (event.type === "error") return typeof event.message === "string";
  return (
    event.type === "done" &&
    typeof event.fromCache === "boolean" &&
    typeof event.hasMore === "boolean" &&
    (typeof event.nextOffset === "number" || event.nextOffset === null)
  );
}

export function ResultsScreen() {
  const {
    state,
    toggleCompare,
    clearCompareIds,
    clearTransientResultsState,
    setRestaurants,
    appendRestaurants,
    updateRestaurant,
  } = useBooking();
  const query = useBookingQuery();
  const submittedSearchKeyRef = useRef<string | null>(null);
  const hasReceivedInitialMapCenterRef = useRef(false);
  const committedMapCenterRef = useRef<MapSearchCenter | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isInitialSearching, setIsInitialSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] =
    useState<StoreListScrollTarget | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [searchPhase, setSearchPhase] = useState<SearchPhase | null>(null);
  const [phaseRestaurantCount, setPhaseRestaurantCount] = useState(0);
  const [latestMapCenter, setLatestMapCenter] =
    useState<MapSearchCenter | null>(null);
  const [activeSearchCenter, setActiveSearchCenter] =
    useState<MapSearchCenter | null>(null);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  const [hiddenTiers, setHiddenTiers] = useState<Set<TierFilterKey>>(new Set());
  const [hiddenCompareGroups, setHiddenCompareGroups] = useState<
    Set<CompareVisibilityGroup>
  >(new Set());
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const [mobileView, setMobileView] = useState<MobileResultsView>("list");
  const conditionsSnapshotRef = useRef<BookingQueryState | null>(null);

  const toggleHiddenTier = useCallback((tier: TierFilterKey) => {
    setHiddenTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  }, []);

  const toggleHiddenCompareGroup = useCallback(
    (group: CompareVisibilityGroup) => {
      setHiddenCompareGroups((prev) => {
        const next = new Set(prev);
        if (next.has(group)) {
          next.delete(group);
        } else {
          next.add(group);
        }
        return next;
      });
    },
    [],
  );

  const handleMarkerClick = useCallback((storeId: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreId(storeId);
    setScrollTarget({ storeId });
    setMobileView("map");
  }, []);

  const handleSelectStore = useCallback((storeId: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreId((currentStoreId) =>
      toggleSelectedStoreId(currentStoreId, storeId),
    );
    setIsCompareOpen(false);
  }, []);

  const searchConditionKey = getSearchConditionKey(query);

  const chatBookingSummary: ResultsChatBookingSummary =
    toResultsChatBookingSummary(query);

  // 施設検索（Places API）が返した順のまま表示する。AI評価（マッチ度）は非同期に
  // 後から届くため、評価到着ごとに並べ替えるとカードが飛び跳ねてしまう。
  const restaurants = Array.isArray(state.restaurants) ? state.restaurants : [];

  const submitSearch = useCallback(
    async (
      mode: FetchMode,
      offset: number,
      searchCenter: MapSearchCenter | null,
      options: SubmitSearchOptions = {},
    ) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      if (mode === "initial") {
        setSearchError(null);
        setRestaurants([]);
        setHasMore(false);
        setNextOffset(null);
        setHasSearched(false);
        setIsInitialSearching(true);
        setActiveStoreId(null);
        setSelectedStoreId(null);
        setIsCompareOpen(false);
        setMobileView("list");
      } else {
        setIsLoadingMore(true);
      }
      setLoadMoreError(null);
      setSearchPhase("condition");
      setPhaseRestaurantCount(0);

      try {
        const response = await fetch("/api/restaurants/search/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...toRestaurantSearchCondition(
              query,
              searchCenter
                ? { latitude: searchCenter.lat, longitude: searchCenter.lng }
                : null,
            ),
            limit: PAGE_SIZE,
            offset,
            existingRestaurantKeys: options.excludeExistingRestaurants
              ? restaurants.map((restaurant) =>
                  getRestaurantDeduplicationKey(restaurant),
                )
              : [],
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error("Restaurant search stream failed.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let parsed: unknown;
            try {
              parsed = JSON.parse(trimmed);
            } catch {
              // 不正な1行だけ読み飛ばし、既に届いた結果やストリームの継続を無駄にしない。
              continue;
            }
            if (!isSearchStreamEvent(parsed)) continue;

            if (parsed.type === "phase") {
              setSearchPhase(parsed.phase);
            }
            if (parsed.type === "restaurant") {
              appendRestaurants([parsed.restaurant]);
              setHasSearched(true);
            }
            if (parsed.type === "restaurant-evaluated") {
              updateRestaurant(parsed.restaurant);
              setPhaseRestaurantCount((count) => count + 1);
            }
            if (parsed.type === "error") {
              if (mode === "initial") {
                setSearchError(parsed.message);
              } else {
                setLoadMoreError(parsed.message);
              }
            }
            if (parsed.type === "done") {
              setHasMore(parsed.hasMore);
              setNextOffset(parsed.nextOffset);
              setHasSearched(true);
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (mode === "initial") {
          setRestaurants([]);
          setSearchError(
            "レストラン検索に失敗しました。条件を変えて再検索してください。",
          );
          setHasSearched(true);
        } else {
          setLoadMoreError("追加の店舗を取得できませんでした。");
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        if (mode === "initial") {
          setIsInitialSearching(false);
        } else {
          setIsLoadingMore(false);
        }
        setSearchPhase(null);
      }
    },
    [
      appendRestaurants,
      query,
      restaurants,
      setRestaurants,
      updateRestaurant,
    ],
  );

  useEffect(() => {
    // ヘッダで条件を編集中は、入力のたびに URL query state（＝searchConditionKey）が
    // 変化してもここでは再検索しない。編集完了時に confirmConditions が明示的に再検索する。
    if (isEditingConditions) return;
    if (submittedSearchKeyRef.current === searchConditionKey) return;
    submittedSearchKeyRef.current = searchConditionKey;
    clearTransientResultsState();
    setActiveSearchCenter(null);
    setLatestMapCenter(null);
    setShowSearchThisArea(false);
    setHiddenTiers(new Set());
    hasReceivedInitialMapCenterRef.current = false;
    committedMapCenterRef.current = null;
    submitSearch("initial", 0, null);
    // 検索条件は URL query state を正とし、正規化済み condition key が変わったときだけ再検索する。
    // StrictMode の開発時二重実行では mount→cleanup→mountが同一インスタンスに対して起こり、
    // ここで abort すると2回目の mount は key 記録により再実行されず、
    // 検索が永久に完了しなくなる（実際にAbortErrorで検索が止まる不具合を確認済み）。
    // submitSearch 自身が次回呼び出し時に前回のコントローラーを abort するため、
    // ここでの明示的な cleanup abort は行わない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchConditionKey, isEditingConditions]);

  const loadMore = useCallback(() => {
    if (!canRequestMoreResults({ isLoadingMore, hasMore, nextOffset })) return;
    if (nextOffset === null) return;
    submitSearch("more", nextOffset, activeSearchCenter);
  }, [activeSearchCenter, hasMore, isLoadingMore, nextOffset, submitSearch]);

  const handleMapCenterChanged = useCallback((center: MapSearchCenter) => {
    setLatestMapCenter(center);
    if (!hasReceivedInitialMapCenterRef.current) {
      hasReceivedInitialMapCenterRef.current = true;
      committedMapCenterRef.current = center;
      return;
    }

    const committed = committedMapCenterRef.current;
    if (!committed) {
      committedMapCenterRef.current = center;
      return;
    }
    setShowSearchThisArea(hasMapCenterMoved(committed, center));
  }, []);

  const searchThisArea = useCallback(() => {
    if (!latestMapCenter) return;
    committedMapCenterRef.current = latestMapCenter;
    setActiveSearchCenter(latestMapCenter);
    setShowSearchThisArea(false);
    submitSearch("more", 0, latestMapCenter, {
      excludeExistingRestaurants: true,
    });
  }, [latestMapCenter, submitSearch]);

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

  const recapKeyword = activeSearchCenter
    ? "地図の表示エリア"
    : query.selectedAreas.length
      ? query.selectedAreas.join("・")
      : "エリア未指定";
  const recapDateTime = `${query.date} ${query.time}`;
  const recapBudget =
    query.budgetMin !== "指定なし" || query.budgetMax !== "指定なし"
      ? `${query.budgetMin} 〜 ${query.budgetMax}`
      : query.budgetOtherOn && query.budgetOtherText.trim()
        ? query.budgetOtherText
        : "指定なし";
  const recapPriorities = query.priorities.length
    ? query.priorities.map((k) => getPriorityLabel(k)).join("・")
    : query.counterpart
      ? "指定なし"
      : "未ヒアリング";

  const hasVisibleStores = restaurants.length > 0;
  const shouldShowStoreSkeleton = searchPhase === "searching";
  const shouldShowInitialSkeleton =
    shouldShowStoreSkeleton && !hasVisibleStores;
  const selectedStore =
    restaurants.find((store) => store.id === selectedStoreId) ?? null;
  const compareCount = state.compareIds.length;
  const canCompare = compareCount >= MIN_COMPARE_COUNT;
  const compareStores = restaurants.filter((store) =>
    state.compareIds.includes(store.id),
  );

  const startEditingConditions = () => {
    conditionsSnapshotRef.current = {
      selectedAreas: query.selectedAreas,
      date: query.date,
      time: query.time,
      people: query.people,
      counterpart: query.counterpart,
      counterpartOtherText: query.counterpartOtherText,
      budgetMin: query.budgetMin,
      budgetMax: query.budgetMax,
      budgetOtherOn: query.budgetOtherOn,
      budgetOtherText: query.budgetOtherText,
      priorities: query.priorities,
      priorityOtherOn: query.priorityOtherOn,
      priorityOtherText: query.priorityOtherText,
    };
    setIsEditingConditions(true);
  };

  const confirmConditions = useCallback(() => {
    setIsEditingConditions(false);
    conditionsSnapshotRef.current = null;
    clearCompareIds();
    clearTransientResultsState();
    setActiveSearchCenter(null);
    setLatestMapCenter(null);
    setShowSearchThisArea(false);
    setHiddenTiers(new Set());
    hasReceivedInitialMapCenterRef.current = false;
    committedMapCenterRef.current = null;
    submittedSearchKeyRef.current = searchConditionKey;
    submitSearch("initial", 0, null);
  }, [clearCompareIds, clearTransientResultsState, searchConditionKey, submitSearch]);

  const cancelConditions = useCallback(() => {
    setIsEditingConditions(false);
    const snapshot = conditionsSnapshotRef.current;
    conditionsSnapshotRef.current = null;
    if (snapshot) {
      query.setQueryState(snapshot);
    }
  }, [query]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden box-border">
      <ResultsSummaryBar
        recapKeyword={recapKeyword}
        recapDateTime={recapDateTime}
        people={query.people}
        recapBudget={recapBudget}
        recapPriorities={recapPriorities}
        isEditingConditions={isEditingConditions}
        onStartEditingConditions={startEditingConditions}
        onConfirmConditions={confirmConditions}
        onCancelConditions={cancelConditions}
        searchPhase={isInitialSearching || isLoadingMore ? searchPhase : null}
        phaseRestaurantCount={phaseRestaurantCount}
      />

      <div className="flex-none border-b border-[#e4ded0] bg-[#f7f4ee] px-4 py-2 md:hidden">
        <div className="grid grid-cols-2 rounded-md border border-[#d8d2c0] bg-white p-1">
          {(["list", "map"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setMobileView(view)}
              aria-pressed={mobileView === view}
              className="rounded px-3 py-2 text-[13px] font-bold transition-colors aria-pressed:bg-[#12202f] aria-pressed:text-[#fffdf8]"
            >
              {view === "list" ? "一覧" : "地図"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 flex overflow-hidden min-h-0">
        {shouldShowInitialSkeleton ? (
          <>
            <StoreListSkeleton
              className={mobileView === "list" ? "" : "hidden md:flex"}
            />
            <div
              className={`${mobileView === "map" ? "block" : "hidden"} min-w-0 flex-1 md:block`}
            >
              <ResultsMap
                stores={[]}
                bookingSummary={chatBookingSummary}
                hiddenTiers={hiddenTiers}
                onToggleTier={toggleHiddenTier}
                compareIds={state.compareIds}
                hiddenCompareGroups={hiddenCompareGroups}
                onToggleCompareGroup={toggleHiddenCompareGroup}
              />
            </div>
          </>
        ) : searchError && !hasVisibleStores ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#79726a] text-sm">
            <div>{searchError}</div>
            <button
              type="button"
              onClick={startEditingConditions}
              className="text-[13px] text-[#8a6a1a] underline bg-transparent border-none cursor-pointer"
            >
              条件を変更する
            </button>
          </div>
        ) : hasSearched && !isInitialSearching && restaurants.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#79726a] text-sm">
            <div>条件に合う店舗が見つかりませんでした。</div>
            <button
              type="button"
              onClick={startEditingConditions}
              className="text-[13px] text-[#8a6a1a] underline bg-transparent border-none cursor-pointer"
            >
              条件を変更する
            </button>
          </div>
        ) : (
          <>
            <StoreList
              stores={restaurants}
              compareIds={state.compareIds}
              onToggleCompare={toggleCompare}
              counterpartId={query.counterpart}
              activeStoreId={activeStoreId}
              selectedStoreId={selectedStoreId}
              onActivateStore={setActiveStoreId}
              onSelectStore={handleSelectStore}
              scrollTarget={scrollTarget}
              hiddenTiers={hiddenTiers}
              className={mobileView === "list" ? "" : "hidden md:flex"}
              banner={
                searchError && hasVisibleStores ? (
                  <div
                    data-testid="evaluation-error-banner"
                    className="text-[13px] text-[#8a6a1a] bg-[#f3e7cf] border border-[#e0c98f] rounded-md px-3 py-2"
                  >
                    {searchError}
                  </div>
                ) : null
              }
              footer={
                <>
                  {shouldShowStoreSkeleton && (
                    <StoreListSkeletonItems count={3} />
                  )}
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
                  <div
                    ref={loadMoreRef}
                    data-testid="results-load-more-sentinel"
                  />
                </>
              }
            />
            <div
              className={`relative min-w-0 flex-1 ${mobileView === "map" ? "block" : "hidden"} md:block`}
            >
              <ResultsMap
                stores={restaurants}
                bookingSummary={chatBookingSummary}
                activeStoreId={activeStoreId}
                focusStoreId={selectedStoreId}
                onMarkerClick={handleMarkerClick}
                onCenterChanged={handleMapCenterChanged}
                showSearchThisArea={showSearchThisArea}
                onSearchThisArea={searchThisArea}
                hiddenTiers={hiddenTiers}
                onToggleTier={toggleHiddenTier}
                compareIds={state.compareIds}
                hiddenCompareGroups={hiddenCompareGroups}
                onToggleCompareGroup={toggleHiddenCompareGroup}
              />
              <div className="hidden md:block">
                {selectedStore && (
                  <StoreDetailPanel
                    key={selectedStore.id}
                    store={selectedStore}
                    onClose={() => setSelectedStoreId(null)}
                  />
                )}
                {(canCompare || isCompareOpen) && (
                  <ComparePanel
                    stores={compareStores}
                    counterpartId={query.counterpart}
                    isOpen={isCompareOpen}
                  />
                )}
              </div>
            </div>
            <div className="md:hidden">
              {selectedStore && (
                <StoreDetailPanel
                  key={selectedStore.id}
                  store={selectedStore}
                  onClose={() => setSelectedStoreId(null)}
                />
              )}
              {(canCompare || isCompareOpen) && (
                <ComparePanel
                  stores={compareStores}
                  counterpartId={query.counterpart}
                  isOpen={isCompareOpen}
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
          setIsCompareOpen((open) => (open ? false : canCompare))
        }
      />
    </div>
  );
}
