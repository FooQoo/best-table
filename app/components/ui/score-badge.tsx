import { GOLD, type Store } from "~/mocks/data";

type ScoreBadgeProps = {
  score: Store["score"];
  showLabel?: boolean;
};

export function ScoreBadge({ score, showLabel = true }: ScoreBadgeProps) {
  return (
    <span
      className="font-bold text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap text-[#20201c]"
      style={{ background: score >= 85 ? GOLD : "#eee6d0" }}
    >
      {showLabel ? `安全度 ${score}` : score}
    </span>
  );
}
