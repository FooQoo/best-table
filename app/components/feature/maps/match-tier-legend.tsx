import { MATCH_TIERS, type MatchTier } from "~/domain/models/restaurant";
import { MATCH_TIER_LABELS } from "~/utils/evidence-labels";
import { MATCH_TIER_COLORS } from "./match-tier-colors";

type MatchTierLegendProps = {
  hiddenTiers: ReadonlySet<MatchTier>;
  onToggleTier: (tier: MatchTier) => void;
};

// GIS 風の凡例。AI評価（マッチ度）が届き始めたら地図側で自動的に表示される
// （呼び出し元の ResultsMap を参照）。各行がそれぞれ表示/非表示のトグルになって
// おり、クリックした段階のピンだけを地図上から隠す。マッチ度で塗り分けること
// 自体は常時オンで、ここではオン/オフの切り替えはしない。評価未生成の店舗は
// 「低」に含めて表示する（別行は設けない。app/components/feature/maps/match-tier-colors.ts）。
export function MatchTierLegend({ hiddenTiers, onToggleTier }: MatchTierLegendProps) {
  return (
    <div className="flex flex-col gap-1 text-[11px] text-[#20201c] bg-[#f7f4ee]/95 border border-[#ddd4c2] rounded px-2.5 py-2">
      {MATCH_TIERS.map((tier) => {
        const hidden = hiddenTiers.has(tier);
        return (
          <button
            key={tier}
            type="button"
            onClick={() => onToggleTier(tier)}
            aria-pressed={!hidden}
            title={hidden ? "クリックして地図に表示する" : "クリックして地図から隠す"}
            className="flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-left transition-opacity"
            style={{ opacity: hidden ? 0.4 : 1 }}
          >
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 rounded-full flex-none"
              style={{ background: MATCH_TIER_COLORS[tier] }}
            />
            {MATCH_TIER_LABELS[tier]}
          </button>
        );
      })}
    </div>
  );
}
