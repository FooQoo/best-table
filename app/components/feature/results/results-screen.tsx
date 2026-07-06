import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
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
import type { SearchPhase } from "~/utils/search-phase-message";

const PAGE_SIZE = 10;

type SearchResponse = {
  restaurants: Restaurant[];
  fromCache: boolean;
  hasMore: boolean;
  nextOffset: number | null;
};

type FetchMode = "initial" | "more";

type SearchStreamEvent =
  | { type: "phase"; phase: Exclude<SearchPhase, "condition"> }
  | { type: "restaurant"; restaurant: Restaurant }
  | {
      type: "done";
      fromCache: boolean;
      hasMore: boolean;
      nextOffset: number | null;
    }
  | { type: "error"; message: string };

export function isSearchResponse(value: unknown): value is SearchResponse {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    Array.isArray(body.restaurants) &&
    typeof body.fromCache === "boolean" &&
    typeof body.hasMore === "boolean" &&
    (typeof body.nextOffset === "number" || body.nextOffset === null)
  );
}

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

function isSearchStreamEvent(value: unknown): value is SearchStreamEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  if (event.type === "phase") {
    return event.phase === "grounding" || event.phase === "evaluating";
  }
  if (event.type === "restaurant") return typeof event.restaurant === "object";
  if (event.type === "error") return typeof event.message === "string";
  return (
    event.type === "done" &&
    typeof event.fromCache === "boolean" &&
    typeof event.hasMore === "boolean" &&
    (typeof event.nextOffset === "number" || event.nextOffset === null)
  );
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
  const hasSubmittedRef = useRef(false);
  const pendingModeRef = useRef<FetchMode>("initial");
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
  const [scrollTarget, setScrollTarget] = useState<StoreListScrollTarget | null>(
    null,
  );
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [searchPhase, setSearchPhase] = useState<SearchPhase | null>(null);
  const [phaseRestaurantCount, setPhaseRestaurantCount] = useState(0);

  const handleMarkerClick = useCallback((storeId: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreId(storeId);
    setScrollTarget({ storeId });
  }, []);

  const handleSelectStore = useCallback((storeId: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreId((currentStoreId) =>
      toggleSelectedStoreId(currentStoreId, storeId),
    );
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
    async (mode: FetchMode, offset: number) => {
      pendingModeRef.current = mode;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      if (mode === "initial") {
        setSearchError(null);
        setRestaurants([]);
        setHasSearched(false);
        setIsInitialSearching(true);
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
          body: JSON.stringify({ ...buildCondition(), limit: PAGE_SIZE, offset }),
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
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (mode === "initial") {
          setRestaurants([]);
          setSearchError("レストラン検索に失敗しました。条件を変えて再検索してください。");
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
    [appendRestaurants, buildCondition, setRestaurants],
  );

  useEffect(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    submitSearch("initial", 0);
    // 検索条件は /hearing 経由でのみ変わり、この画面滞在中は変わらないため初回のみ実行する。
    // StrictMode の開発時二重実行では mount→cleanup→mountが同一インスタンスに対して起こり、
    // ここで abort すると2回目の mount は hasSubmittedRef により再実行されず、
    // 検索が永久に完了しなくなる（実際にAbortErrorで検索が止まる不具合を確認済み）。
    // submitSearch 自身が次回呼び出し時に前回のコントローラーを abort するため、
    // ここでの明示的な cleanup abort は行わない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const restaurants = Array.isArray(state.restaurants) ? state.restaurants : [];
  const sortedStores = [...restaurants].sort(
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
        searchPhase={
          isInitialSearching || isLoadingMore ? searchPhase : null
        }
        phaseRestaurantCount={phaseRestaurantCount}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {isInitialSearching ? (
          <>
            <StoreListSkeleton />
            <ResultsMap stores={[]} bookingSummary={chatBookingSummary} />
          </>
        ) : searchError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#79726a] text-sm">
            <div>{searchError}</div>
            <button
              type="button"
              onClick={changeConditions}
              className="text-[13px] text-[#8a6a1a] underline bg-transparent border-none cursor-pointer"
            >
              条件を変更する
            </button>
          </div>
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
              selectedStoreId={selectedStoreId}
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
                  key={selectedStore.id}
                  store={selectedStore}
                  onClose={() => setSelectedStoreId(null)}
                />
              )}
              {(canCompare || isCompareOpen) && (
                <ComparePanel
                  stores={compareStores}
                  counterpartId={state.counterpart}
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
