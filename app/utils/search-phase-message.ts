export type SearchPhase = "searching" | "evaluating";

export function getSearchPhaseMessage(
  phase: SearchPhase,
  restaurantCount: number,
): string {
  switch (phase) {
    case "searching":
      return "周辺の候補店舗を検索しています…";
    case "evaluating":
      return restaurantCount > 0
        ? `AIが店舗を評価しています…（${restaurantCount}件完了）`
        : "AIが店舗を評価しています…";
  }
}
