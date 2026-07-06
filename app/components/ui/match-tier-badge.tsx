import type { MatchTier } from "~/domain/models/restaurant";
import { GOLD } from "~/mocks/data";
import { MATCH_TIER_LABELS } from "~/utils/evidence-labels";

type MatchTierBadgeProps = {
  tier: MatchTier | null;
  showLabel?: boolean;
};

// 地図の凡例（app/components/feature/maps/match-tier-colors.ts）とは別に、
// 一覧・詳細・比較表側は色分けを地図専用に留める（凡例のスコープを地図に限定する）。
// "highest" だけを既存の ScoreBadge の高評価表現（GOLD）と同じ扱いにする。
export function MatchTierBadge({ tier, showLabel = true }: MatchTierBadgeProps) {
  if (tier === null) {
    return (
      <span
        className="font-bold text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap text-[#79726a]"
        style={{ background: "#eee6d0" }}
      >
        {showLabel ? "マッチ度 評価未生成" : "評価未生成"}
      </span>
    );
  }

  return (
    <span
      className="font-bold text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap text-[#20201c]"
      style={{ background: tier === "highest" ? GOLD : "#eee6d0" }}
    >
      {showLabel ? `マッチ度 ${MATCH_TIER_LABELS[tier]}` : MATCH_TIER_LABELS[tier]}
    </span>
  );
}
