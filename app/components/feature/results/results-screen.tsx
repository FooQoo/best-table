import { useNavigate } from "react-router";
import { useBooking } from "~/state/booking-context";
import { PRIORITIES, STORES } from "~/mocks/data";
import { CompareTray } from "~/components/feature/results/compare-tray";
import { ResultsMap } from "~/components/feature/results/results-map";
import { ResultsSummaryBar } from "~/components/feature/results/results-summary-bar";
import { StoreList } from "~/components/feature/results/store-list";

export function ResultsScreen() {
  const navigate = useNavigate();
  const { state, toggleCompare, resetForNewChat } = useBooking();

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

  const sortedStores = [...STORES].sort((a, b) => b.score - a.score);
  const compareCount = state.compareIds.length;
  const canCompare = compareCount >= 2;

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
        <StoreList
          stores={sortedStores}
          compareIds={state.compareIds}
          onToggleCompare={toggleCompare}
        />
        <ResultsMap stores={sortedStores} />
      </div>

      <CompareTray
        compareCount={compareCount}
        canCompare={canCompare}
        onCompare={() => canCompare && navigate("/compare")}
      />
    </div>
  );
}
