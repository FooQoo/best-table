import type { Restaurant } from "~/domain/models/restaurant";

// 一休掲載店マスタとの照合は行わず、店舗名で一休.comの検索結果ページへ
// 送客する（docs/DESIGN.md）。URL は店舗名から組み立てるだけで、AI 生成・
// 自由入力・外部データを含めない。
export function buildIkyuSearchUrl(store: Restaurant): string {
  const params = new URLSearchParams({ term: store.name });
  return `https://restaurant.ikyu.com/search?${params.toString()}`;
}
