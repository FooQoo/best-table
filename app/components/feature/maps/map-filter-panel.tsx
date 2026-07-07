import { CheckIcon } from "lucide-react";
import type { Restaurant } from "~/domain/models/restaurant";
import { MATCH_TIER_LABELS } from "~/utils/evidence-labels";
import {
  MATCH_TIER_COLORS,
  TIER_FILTER_KEYS,
  resolveTierFilterKey,
  type TierFilterKey,
} from "./match-tier-colors";

export type CompareVisibilityGroup = "target" | "excluded";

export const COMPARE_VISIBILITY_GROUPS: readonly CompareVisibilityGroup[] = [
  "target",
  "excluded",
];

const TIER_FILTER_LABELS: Record<TierFilterKey, string> = {
  ...MATCH_TIER_LABELS,
  unevaluated: "評価未生成",
};

const COMPARE_VISIBILITY_LABELS: Record<CompareVisibilityGroup, string> = {
  target: "比較対象",
  excluded: "比較対象外",
};

type FilterRowProps = {
  label: string;
  count: number;
  checked: boolean;
  onClick: () => void;
  dotColor?: string;
};

// 行ごとにチェックボックス（+マッチ度は色ドット）と件数を表示する。チェックを
// 外した行だけが地図から一時的に隠れる（全体をオフにするマスタースイッチは無い）。
function FilterRow({ label, count, checked, onClick, dotColor }: FilterRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      title={checked ? "クリックして地図から隠す" : "クリックして地図に表示する"}
      className="flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-left w-full"
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center size-3.5 rounded-[3px] border border-[#8a8474] flex-none"
        style={{ background: checked ? "#2f5f72" : "transparent" }}
      >
        {checked && <CheckIcon className="size-2.5 text-white" />}
      </span>
      {dotColor && (
        <span
          aria-hidden="true"
          className="inline-block w-2.5 h-2.5 rounded-full flex-none"
          style={{ background: dotColor }}
        />
      )}
      <span className="flex-1">{label}</span>
      <span className="text-[#8a8474]">{count}件</span>
    </button>
  );
}

type MapFilterPanelProps = {
  restaurants: Restaurant[];
  hiddenTiers: ReadonlySet<TierFilterKey>;
  onToggleTier: (tier: TierFilterKey) => void;
  compareIds: readonly string[];
  hiddenCompareGroups: ReadonlySet<CompareVisibilityGroup>;
  onToggleCompareGroup: (group: CompareVisibilityGroup) => void;
};

// GIS 風の絞り込みパネル。マッチ度・比較を1つの枠にまとめ、常時表示する
// （評価やトレイ追加を待たない）。同じ操作感（行のチェックを外すとそのピン
// だけ地図から隠れる）で両セクションを揃える。
export function MapFilterPanel({
  restaurants,
  hiddenTiers,
  onToggleTier,
  compareIds,
  hiddenCompareGroups,
  onToggleCompareGroup,
}: MapFilterPanelProps) {
  const tierCounts: Record<TierFilterKey, number> = {
    highest: 0,
    high: 0,
    medium: 0,
    low: 0,
    unevaluated: 0,
  };
  for (const restaurant of restaurants) {
    tierCounts[resolveTierFilterKey(restaurant.matchTier)] += 1;
  }

  const targetCount = restaurants.filter((restaurant) =>
    compareIds.includes(restaurant.id),
  ).length;
  const compareCounts: Record<CompareVisibilityGroup, number> = {
    target: targetCount,
    excluded: restaurants.length - targetCount,
  };

  return (
    <div className="flex flex-col gap-2 min-w-[136px] text-[11px] text-[#20201c] bg-[#f7f4ee]/95 border border-[#ddd4c2] rounded px-2.5 py-2">
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold text-[#8a8474]">マッチ度</div>
        {TIER_FILTER_KEYS.map((tier) => (
          <FilterRow
            key={tier}
            label={TIER_FILTER_LABELS[tier]}
            count={tierCounts[tier]}
            checked={!hiddenTiers.has(tier)}
            onClick={() => onToggleTier(tier)}
            dotColor={tier === "unevaluated" ? undefined : MATCH_TIER_COLORS[tier]}
          />
        ))}
      </div>
      <div className="h-px bg-[#ddd4c2]" />
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold text-[#8a8474]">比較</div>
        {COMPARE_VISIBILITY_GROUPS.map((group) => (
          <FilterRow
            key={group}
            label={COMPARE_VISIBILITY_LABELS[group]}
            count={compareCounts[group]}
            checked={!hiddenCompareGroups.has(group)}
            onClick={() => onToggleCompareGroup(group)}
          />
        ))}
      </div>
    </div>
  );
}
