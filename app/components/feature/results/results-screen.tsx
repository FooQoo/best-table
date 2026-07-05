import { useEffect, useRef } from "react";
import { useFetcher, useNavigate } from "react-router";
import type { Restaurant } from "~/domain/models/restaurant";
import { MIN_COMPARE_COUNT } from "~/domain/models/restaurant";
import { useBooking } from "~/state/booking-context";
import { PRIORITIES } from "~/mocks/data";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";
import { CompareTray } from "~/components/feature/results/compare-tray";
import { ResultsMap } from "~/components/feature/results/results-map";
import { ResultsSummaryBar } from "~/components/feature/results/results-summary-bar";
import { StoreList } from "~/components/feature/results/store-list";

type SearchResponse = { restaurants: Restaurant[]; fromCache: boolean };

export function ResultsScreen() {
  const navigate = useNavigate();
  const { state, toggleCompare, resetForNewChat, setRestaurants } = useBooking();
  const fetcher = useFetcher<SearchResponse>();
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const condition: RestaurantSearchQueryCondition = {
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

    fetcher.submit(JSON.stringify(condition), {
      method: "post",
      action: "/api/restaurants/search",
      encType: "application/json",
    });
    // 検索条件は /hearing 経由でのみ変わり、この画面滞在中は変わらないため初回のみ実行する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setRestaurants(fetcher.data.restaurants);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data]);

  const isSearching = !fetcher.data && fetcher.state !== "idle";
  const hasSearched = Boolean(fetcher.data);

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
  const compareCount = state.compareIds.length;
  const canCompare = compareCount >= MIN_COMPARE_COUNT;

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
        {isSearching ? (
          <div className="flex-1 flex items-center justify-center text-[#79726a] text-sm">
            条件に合う店舗をAIが探しています…
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
            />
            <ResultsMap stores={sortedStores} />
          </>
        )}
      </div>

      <CompareTray
        compareCount={compareCount}
        canCompare={canCompare}
        onCompare={() => canCompare && navigate("/compare")}
      />
    </div>
  );
}
