import {
  getSearchPhaseMessage,
  type SearchPhase,
} from "~/utils/search-phase-message";

type SearchPhaseStatusProps = {
  phase: SearchPhase;
  restaurantCount: number;
};

export function SearchPhaseStatus({
  phase,
  restaurantCount,
}: SearchPhaseStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-[13px] text-[#79726a]"
    >
      <span
        aria-hidden="true"
        className="size-3 flex-none animate-spin rounded-full border-2 border-[#d8c79d] border-t-[#8a6a1a]"
      />
      <span>{getSearchPhaseMessage(phase, restaurantCount)}</span>
    </div>
  );
}
