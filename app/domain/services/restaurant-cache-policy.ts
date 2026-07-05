// docs/ARCHITECTURE.md「検索・評価型」/ docs/RELIABILITY.md「段階的表示」の前提となる
// キャッシュキー生成・鮮度判定の中核ロジック。外部 API・ストレージには依存しない純粋関数のみを置く。
// 実際の保存・取得は UoW-7 で app/server/repositories/ に実装する。

export type SearchConditionForCacheKey = {
  selectedAreas: string[];
  date: string;
  time: string;
  people: number;
  budgetMin: string;
  budgetMax: string;
  priorities: string[];
  counterpart: string | null;
};

// 相手種別に依存する AI 評価をキャッシュに含めるため、counterpart をキーから外さない
// （docs/ARCHITECTURE.md 163行目）。配列項目は選択順序に意味を持たせず、同一条件は
// 同一キーになるようソートしてから結合する。
export function buildRestaurantSearchCacheKey(
  condition: SearchConditionForCacheKey,
): string {
  const areas = [...condition.selectedAreas].sort().join(",");
  const priorities = [...condition.priorities].sort().join(",");
  return [
    areas,
    condition.date,
    condition.time,
    String(condition.people),
    condition.budgetMin,
    condition.budgetMax,
    priorities,
    condition.counterpart ?? "none",
  ].join("|");
}

export const RESTAURANT_CACHE_TTL_MS = 30 * 60 * 1000;

// generatedAt が無い（未生成）レコードは鮮度判定の対象外として false を返す。
// 呼び出し側で「未生成 = 再生成が必要」として扱う。
export function isRestaurantCacheFresh(
  generatedAt: string | null,
  now: Date,
  ttlMs: number = RESTAURANT_CACHE_TTL_MS,
): boolean {
  if (generatedAt === null) return false;
  const generatedAtMs = Date.parse(generatedAt);
  if (Number.isNaN(generatedAtMs)) return false;
  return now.getTime() - generatedAtMs < ttlMs;
}
