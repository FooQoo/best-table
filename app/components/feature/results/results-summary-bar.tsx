import { SearchPhaseStatus } from "~/components/feature/results/search-phase-status";
import type { SearchPhase } from "~/utils/search-phase-message";

type ResultsSummaryBarProps = {
  recapKeyword: string;
  recapDateTime: string;
  people: number;
  recapBudget: string;
  recapPriorities: string;
  onChangeConditions: () => void;
  searchPhase?: SearchPhase | null;
  phaseRestaurantCount?: number;
};

export function ResultsSummaryBar({
  recapKeyword,
  recapDateTime,
  people,
  recapBudget,
  recapPriorities,
  onChangeConditions,
  searchPhase,
  phaseRestaurantCount = 0,
}: ResultsSummaryBarProps) {
  return (
    <div className="px-8 py-4 bg-white border-b-[1.5px] border-[#e4ded0] flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0 text-sm text-[#20201c]">
          <span className="whitespace-nowrap">
            <b>{recapKeyword}</b>・{recapDateTime}・{people}名・ご予算：{recapBudget}・重視：{recapPriorities}
          </span>
          {searchPhase && (
            <SearchPhaseStatus
              phase={searchPhase}
              restaurantCount={phaseRestaurantCount}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onChangeConditions}
          className="text-[13px] text-[#8a6a1a] bg-transparent border-none cursor-pointer underline p-1 rounded hover:text-[#5c4610] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
        >
          条件を変更する
        </button>
      </div>
    </div>
  );
}
