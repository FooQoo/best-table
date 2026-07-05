import { useNavigate } from "react-router";
import { CompareTable } from "~/components/feature/compare/compare-table";
import { EmptyCompareState } from "~/components/feature/compare/empty-compare-state";
import { FinalStorePanel } from "~/components/feature/compare/final-store-panel";
import { useBooking } from "~/state/booking-context";
import { STORES } from "~/mocks/data";

export function CompareScreen() {
  const navigate = useNavigate();
  const { state, selectFinalStore } = useBooking();

  const selectedStores = STORES.filter((s) =>
    state.compareIds.includes(s.id),
  ).sort((a, b) => b.score - a.score);
  const selectedCount = selectedStores.length;
  const finalStore =
    selectedStores.find((s) => s.id === state.finalStoreId) ?? null;

  if (selectedCount === 0) {
    return <EmptyCompareState onBack={() => navigate("/results")} />;
  }

  return (
    <div className="flex-1 p-10 flex justify-center">
      <div className="w-full max-w-[1040px]">
        <div className="flex justify-between items-baseline mb-6">
          <h1 className="font-serif font-bold text-2xl m-0">
            {selectedCount}件を比較中
          </h1>
          <button
            type="button"
            onClick={() => navigate("/results")}
            className="text-[13px] text-[#8a6a1a] bg-transparent border-none cursor-pointer underline p-1 rounded hover:text-[#5c4610] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
          >
            一覧に戻る
          </button>
        </div>

        <CompareTable
          stores={selectedStores}
          finalStoreId={state.finalStoreId}
          onSelectFinalStore={selectFinalStore}
          counterpartId={state.counterpart}
        />

        {finalStore && (
          <FinalStorePanel
            store={finalStore}
            counterpartId={state.counterpart}
            priorities={state.priorities}
          />
        )}
      </div>
    </div>
  );
}
