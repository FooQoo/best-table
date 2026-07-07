import { MATCH_TIERS, type MatchTier } from "~/domain/models/restaurant";
import { GOLD, NAVY, shade } from "~/mocks/data";

// GIS 風の凡例（マッチ度で地図ピンを色分け）用のパレット。既存の GOLD/NAVY
// トークンから2系統（上位2段階=ゴールド系、下位2段階=ネイビー系）で作る。
// 小さいピンでも「良い/弱い」の粗い区別と「濃淡」の細かい区別の両方を見分けやすくする。
export const MATCH_TIER_COLORS: Record<MatchTier, string> = {
  highest: GOLD,
  high: shade(GOLD, 20),
  medium: shade(NAVY, 55),
  low: shade(NAVY, 10),
};

// 未評価（matchTier: null）はピンの色としては「低」と同じ見た目にする。
// データ上は null のままにし（捏造しない）、色分けの単位としてだけ「低」扱いにする。
export function resolveTierKey(matchTier: MatchTier | null): MatchTier {
  return matchTier ?? "low";
}

export function resolveTierColor(matchTier: MatchTier | null): string {
  return MATCH_TIER_COLORS[resolveTierKey(matchTier)];
}

// 絞り込みパネルでは「評価未生成」を独立した行として数え・隠せるようにする
// （色分けは resolveTierKey/resolveTierColor のとおり「低」のまま変えない）。
export type TierFilterKey = MatchTier | "unevaluated";

export const TIER_FILTER_KEYS: readonly TierFilterKey[] = [
  ...MATCH_TIERS,
  "unevaluated",
];

export function resolveTierFilterKey(matchTier: MatchTier | null): TierFilterKey {
  return matchTier ?? "unevaluated";
}
