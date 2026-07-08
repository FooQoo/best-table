import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
  type TouchEventHandler,
} from "react";
import { useSearchParams } from "react-router";
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
import { cn } from "~/utils/cn";
import { Z_INDEX } from "~/styles/z-index";
import { getRestaurantDeduplicationKey } from "~/utils/restaurant-deduplication";

const PAGE_SIZE = 10;

type FetchMode = "initial" | "more";
type MapSearchCenter = { lat: number; lng: number };
type MobileResultsView = "list" | "map";

type SearchStreamEvent =
  | { type: "phase"; phase: SearchPhase }
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

type RestaurantSearchResponse = {
  restaurants: Restaurant[];
  fromCache: boolean;
  hasMore: boolean;
  nextOffset: number | null;
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

// 地図左端の細いスワイプ受付ストリップ。地図本体（ここ以外の全域）はパン操作専用とし、
// このストリップだけで一覧へ戻るスワイプを受け付ける。スケルトン表示中・結果表示中の
// 両方で同じ見た目・挙動が必要なため、共通コンポーネントとして切り出す。
function MapSwipeEdge({
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: {
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  onTouchMove: TouchEventHandler<HTMLDivElement>;
  onTouchEnd: TouchEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={cn(
        "absolute inset-y-0 left-0 w-16 touch-none md:hidden",
        Z_INDEX.mapSwipeEdge,
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-hidden="true"
    />
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
  const conditionsSnapshotRef = useRef<BookingQueryState | null>(null);

  // 「今どちらの画面を見ているか」は URL の view パラメータで表現する。検索条件
  // （areas/date/... 等）とは別のキーなので、切り替えても再検索・再評価は起きない
  // （setQueryState は view を含まない URLSearchParams で置き換えるため、条件編集を
  // 確定すると view は自然に消え一覧へ戻る）。ブラウザの「戻る」は通常のページ内
  // ナビゲーションとして働くので、地図表示中の「戻る」は一覧に戻るだけで
  // /results を離れない。
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileView: MobileResultsView =
    searchParams.get("view") === "map" ? "map" : "list";

  const switchToMap = useCallback(() => {
    if (mobileView === "map") return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", "map");
      return next;
    });
  }, [mobileView, setSearchParams]);

  const switchToList = useCallback(() => {
    if (mobileView === "list") return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("view");
      return next;
    });
  }, [mobileView, setSearchParams]);

  // スマホアプリ風に、スワイプ中は指へ 1:1 で追従させる。対象は一覧本体と地図左端の
  // 細いストリップだけにし、地図のパン操作（ストリップ以外の全域）とは取り合わない。
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragAxisRef = useRef<"horizontal" | "vertical" | null>(null);
  const dragPanelWidthRef = useRef(0);

  const clearTrackInlineStyle = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = "";
    track.style.translate = "";
  }, []);

  const handleSwipeTouchStart = useCallback((event: ReactTouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    dragAxisRef.current = null;
    const track = trackRef.current;
    // トラック幅は 200%（=パネル2枚分）なので、半分が1画面（パネル1枚）の幅。
    dragPanelWidthRef.current = track
      ? track.clientWidth / 2
      : window.innerWidth;
  }, []);

  const handleSwipeTouchMove = useCallback(
    (event: ReactTouchEvent) => {
      const start = dragStartRef.current;
      const track = trackRef.current;
      if (!start || !track) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      // 最初のわずかな移動で縦スクロールか横スワイプかを判定し、以後はその軸に固定する。
      if (dragAxisRef.current === null) {
        if (Math.hypot(dx, dy) < 8) return;
        dragAxisRef.current =
          Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        if (dragAxisRef.current === "horizontal") {
          track.style.transition = "none";
        }
      }
      if (dragAxisRef.current !== "horizontal") return;
      const width = dragPanelWidthRef.current || 1;
      const base = mobileView === "map" ? -width : 0;
      const offset = Math.min(0, Math.max(-width, base + dx));
      track.style.translate = `${offset}px`;
    },
    [mobileView],
  );

  const handleSwipeTouchEnd = useCallback(
    (event: ReactTouchEvent) => {
      const start = dragStartRef.current;
      const track = trackRef.current;
      dragStartRef.current = null;
      const wasHorizontal = dragAxisRef.current === "horizontal";
      dragAxisRef.current = null;
      if (!start || !track || !wasHorizontal) return;
      const touch = event.changedTouches[0];
      const width = dragPanelWidthRef.current || 1;
      const dx = touch ? touch.clientX - start.x : 0;
      // 画面幅の 4割を超えて引いたらビューを切り替え、そうでなければ元へスナップして戻す。
      // やや大きめの閾値にして、軽く触れただけで意図せず切り替わらないようにする。
      const threshold = width * 0.4;
      const target: MobileResultsView =
        mobileView === "list" && dx < -threshold
          ? "map"
          : mobileView === "map" && dx > threshold
            ? "list"
            : mobileView;
      track.style.transition = "";
      track.style.translate = target === "map" ? "-50%" : "0%";
      // 遷移が終わったら inline style を外し、className ベースの translate
      // （タブタップでの切り替え）に制御を戻す。念のためタイムアウトでも保険をかける。
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        track.removeEventListener("transitionend", cleanup);
        clearTrackInlineStyle();
      };
      track.addEventListener("transitionend", cleanup);
      window.setTimeout(cleanup, 350);
      if (target === "map") switchToMap();
      else switchToList();
    },
    [mobileView, switchToMap, switchToList, clearTrackInlineStyle],
  );

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

  const handleMarkerClick = useCallback(
    (storeId: string) => {
      setActiveStoreId(storeId);
      setSelectedStoreId(storeId);
      setScrollTarget({ storeId });
      switchToMap();
    },
    [switchToMap],
  );

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
      } else {
        setIsLoadingMore(true);
      }
      setLoadMoreError(null);
      setSearchPhase(null);
      setPhaseRestaurantCount(0);

      try {
        setSearchPhase("searching");
        const searchResponse = await fetch("/api/restaurants/search", {
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
        if (!searchResponse.ok) {
          throw new Error("Restaurant search failed.");
        }

        const searchResult =
          (await searchResponse.json()) as RestaurantSearchResponse;
        if (!Array.isArray(searchResult.restaurants)) {
          throw new Error("Restaurant search response is invalid.");
        }

        if (mode === "initial") {
          setRestaurants(searchResult.restaurants);
        } else {
          appendRestaurants(searchResult.restaurants);
        }
        setHasMore(searchResult.hasMore);
        setNextOffset(searchResult.nextOffset);
        setHasSearched(true);

        if (searchResult.restaurants.length === 0) {
          return;
        }

        setSearchPhase("evaluating");
        const evaluationResponse = await fetch(
          "/api/restaurants/evaluate/stream",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...toRestaurantSearchCondition(
                query,
                searchCenter
                  ? { latitude: searchCenter.lat, longitude: searchCenter.lng }
                  : null,
              ),
              restaurants: searchResult.restaurants,
            }),
            signal: controller.signal,
          },
        );
        if (!evaluationResponse.ok || !evaluationResponse.body) {
          throw new Error("Restaurant evaluation stream failed.");
        }

        const reader = evaluationResponse.body.getReader();
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
    [appendRestaurants, query, restaurants, setRestaurants, updateRestaurant],
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
  }, [
    clearCompareIds,
    clearTransientResultsState,
    searchConditionKey,
    submitSearch,
  ]);

  const cancelConditions = useCallback(() => {
    setIsEditingConditions(false);
    const snapshot = conditionsSnapshotRef.current;
    conditionsSnapshotRef.current = null;
    if (snapshot) {
      query.setQueryState(snapshot);
    }
  }, [query]);

  // モバイルでは一覧/地図を横並びのトラックに載せ、タブ切り替え時に translateX でスライドする。
  // PC(md:) ではトラックを無効化し、従来どおり左右分割レイアウトに戻す。
  const carouselTrackClass = cn(
    "flex w-[200%] flex-none transition-transform duration-300 ease-out will-change-transform md:w-full md:translate-x-0",
    mobileView === "map" ? "-translate-x-1/2" : "translate-x-0",
  );

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col overflow-hidden box-border">
      <div className="relative flex flex-1 flex-col overflow-hidden min-h-0">
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
                onClick={() =>
                  view === "map" ? switchToMap() : switchToList()
                }
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
            <div ref={trackRef} className={carouselTrackClass}>
              <div className="flex w-1/2 flex-none md:w-[400px]">
                <StoreListSkeleton />
              </div>
              <div className="relative w-1/2 flex-none md:min-w-0 md:flex-1">
                <MapSwipeEdge
                  onTouchStart={handleSwipeTouchStart}
                  onTouchMove={handleSwipeTouchMove}
                  onTouchEnd={handleSwipeTouchEnd}
                />
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
            </div>
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
              <div ref={trackRef} className={carouselTrackClass}>
                <div className="flex w-1/2 flex-none md:w-[400px]">
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
                    hiddenCompareGroups={hiddenCompareGroups}
                    className="touch-pan-y"
                    onTouchStart={handleSwipeTouchStart}
                    onTouchMove={handleSwipeTouchMove}
                    onTouchEnd={handleSwipeTouchEnd}
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
                </div>
                <div className="relative w-1/2 flex-none md:min-w-0 md:flex-1">
                  <MapSwipeEdge
                    onTouchStart={handleSwipeTouchStart}
                    onTouchMove={handleSwipeTouchMove}
                    onTouchEnd={handleSwipeTouchEnd}
                  />
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
              </div>
              <div className="md:hidden">
                {selectedStore && (
                  <>
                    {/* 一覧表示中は、パネルの inset 余白にスクロール中のカードがはみ出すことがあり、
                      そこをタップすると閉じずにカードへ貫通してしまう。全面バックドロップを敷いて
                      タップの到達先をカードから塞ぐことで、StoreDetailPanel 自身が持つ「外側タップで
                      閉じる」判定（pointerup, isOutsideTarget）に正しく検知させる。閉じる処理自体は
                      その既存ロジックに任せるため、この div に onClick は付けない
                      （地図表示中はマーカー間の直接切り替えを妨げないよう対象外）。 */}
                    {mobileView === "list" && (
                      <div
                        className={cn(
                          "absolute inset-0",
                          Z_INDEX.storeDetailBackdrop,
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <StoreDetailPanel
                      key={selectedStore.id}
                      store={selectedStore}
                      onClose={() => setSelectedStoreId(null)}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="md:hidden">
          {(canCompare || isCompareOpen) && (
            <ComparePanel
              stores={compareStores}
              counterpartId={query.counterpart}
              isOpen={isCompareOpen}
            />
          )}
        </div>
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
