import type { IkyuListing } from "~/domain/models/ikyu-listing";

// docs/plans/mvp-cycle-6/PLANS.md: 一休掲載店マスタの公開 API は存在しないため、
// このサイクルでは実在店の一休詳細ページ URL ではなく、架空店舗用のダミー URL を
// 手動記録した fixture として用意する（app/mocks/data.ts の STORES.ikyu と同様）。
// IkyuListingRepository の実装を差し替えるだけで、将来の提携データ・API に置き換えられる。
export const IKYU_LISTINGS: IkyuListing[] = [
  {
    url: "https://restaurant.ikyu.com/100001/",
    name: "日本料理 花明かり",
    address: null,
    phone: "03-1234-5601",
    placeId: null,
  },
  {
    url: "https://restaurant.ikyu.com/100002/",
    name: "鉄板焼 円",
    address: null,
    phone: "03-1234-5602",
    placeId: null,
  },
  {
    url: "https://restaurant.ikyu.com/100004/",
    name: "京料理 和心",
    address: null,
    phone: "03-1234-5604",
    placeId: null,
  },
  {
    url: "https://restaurant.ikyu.com/100010/",
    name: "料亭 十番",
    address: "東京都港区麻布十番1-2-3",
    phone: null,
    placeId: null,
  },
  {
    url: "https://restaurant.ikyu.com/100011/",
    name: "鮨 銀座 幸",
    address: null,
    phone: null,
    placeId: "places/mock-ikyu-100011",
  },
];
