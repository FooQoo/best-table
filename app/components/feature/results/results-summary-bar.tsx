import { SearchPhaseStatus } from "~/components/feature/results/search-phase-status";
import { AreaPicker } from "~/components/feature/top/area-picker";
import { BudgetStep } from "~/components/feature/hearing/budget-step";
import { CounterpartStep } from "~/components/feature/hearing/counterpart-step";
import { PriorityStep } from "~/components/feature/hearing/priority-step";
import { Input } from "~/components/ui/input";
import { QuantityStepper } from "~/components/ui/quantity-stepper";
import { useBookingQuery } from "~/state/booking-query-state";
import { Z_INDEX } from "~/styles/z-index";
import type { SearchPhase } from "~/utils/search-phase-message";

type ResultsSummaryBarProps = {
  recapKeyword: string;
  recapDateTime: string;
  people: number;
  recapBudget: string;
  recapPriorities: string;
  isEditingConditions: boolean;
  onStartEditingConditions: () => void;
  onConfirmConditions: () => void;
  onCancelConditions: () => void;
  searchPhase?: SearchPhase | null;
  phaseRestaurantCount?: number;
};

export function ResultsSummaryBar({
  recapKeyword,
  recapDateTime,
  people,
  recapBudget,
  recapPriorities,
  isEditingConditions,
  onStartEditingConditions,
  onConfirmConditions,
  onCancelConditions,
  searchPhase,
  phaseRestaurantCount = 0,
}: ResultsSummaryBarProps) {
  return (
    <div className="relative bg-white border-b-[1.5px] border-[#e4ded0]">
      <div className="flex items-center gap-2 px-4 py-2 sm:gap-4 sm:px-8 sm:py-4">
        {isEditingConditions ? (
          <span className="min-w-0 flex-1 truncate text-xs text-[#20201c] sm:text-sm">
            条件を編集しています
          </span>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-[#20201c] sm:gap-3 sm:text-sm">
            <span className="min-w-0 flex-1 truncate leading-relaxed">
              <b>{recapKeyword}</b>・{recapDateTime}・{people}名・ご予算：
              {recapBudget}・重視：{recapPriorities}
            </span>
            {searchPhase && (
              <SearchPhaseStatus
                phase={searchPhase}
                restaurantCount={phaseRestaurantCount}
              />
            )}
          </div>
        )}
        <div className="flex flex-none items-center justify-end gap-2 sm:gap-3">
          {isEditingConditions && (
            <button
              type="button"
              onClick={onConfirmConditions}
              className="text-xs text-[#8a6a1a] bg-transparent border-none cursor-pointer underline p-1 rounded whitespace-nowrap hover:text-[#5c4610] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)] sm:text-[13px]"
            >
              条件の変更を完了する
            </button>
          )}
          {/* 「条件を変更する」→「キャンセル」は同じ位置・幅のボタンとして切り替える。
              連打で確定ボタンを押してしまわないよう、この定位置には常に安全な操作のみを置く。 */}
          <button
            type="button"
            onClick={
              isEditingConditions ? onCancelConditions : onStartEditingConditions
            }
            className="w-16 whitespace-nowrap rounded border-none bg-transparent p-1 text-center text-xs text-[#8a6a1a] underline cursor-pointer hover:text-[#5c4610] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)] sm:w-28 sm:text-[13px]"
          >
            {isEditingConditions ? "キャンセル" : "条件を変更する"}
          </button>
        </div>
      </div>

      {isEditingConditions && (
        <div
          className={`absolute left-0 right-0 top-full ${Z_INDEX.conditionsEditorOverlay} max-h-[calc(100dvh-160px)] overflow-y-auto border-b-[1.5px] border-[#e4ded0] bg-white px-4 py-4 shadow-[0_12px_24px_rgba(20,20,20,.14)] sm:px-8 sm:py-5`}
        >
          <ConditionsEditor />
        </div>
      )}
    </div>
  );
}

function ConditionsEditor() {
  const query = useBookingQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <AreaPicker />
        <Input
          type="date"
          value={query.date}
          onChange={(e) => query.setDate(e.target.value)}
          className="h-auto w-full rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px] sm:w-auto sm:flex-none"
        />
        <Input
          type="time"
          value={query.time}
          onChange={(e) => query.setTime(e.target.value)}
          className="h-auto w-full rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px] sm:w-auto sm:flex-none"
        />
        <QuantityStepper
          value={query.people}
          labelSuffix="名"
          onIncrement={query.incPeople}
          onDecrement={query.decPeople}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <CounterpartStep />
        <BudgetStep />
        <PriorityStep />
      </div>
    </div>
  );
}
