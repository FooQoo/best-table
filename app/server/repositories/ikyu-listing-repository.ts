import { isIkyuListing, type IkyuListing } from "~/domain/models/ikyu-listing";
import { IKYU_LISTINGS } from "~/mocks/ikyu-listings";

// docs/ARCHITECTURE.md「一休掲載店の店舗同定」: 一休掲載店マスタの取得境界。
// mvp-cycle-6 ではモック fixture（app/mocks/ikyu-listings.ts）を読むだけの実装とし、
// 将来の提携データ・API に差し替え可能なインターフェースにする。
export type IkyuListingRepository = {
  list(): Promise<IkyuListing[]>;
};

export type IkyuListingLoader = () => IkyuListing[];

const defaultLoad: IkyuListingLoader = () => IKYU_LISTINGS;

export function createIkyuListingRepository(
  load: IkyuListingLoader = defaultLoad,
): IkyuListingRepository {
  return {
    async list() {
      let listings: unknown;
      try {
        listings = load();
      } catch (error) {
        console.warn("[ikyu-listing-mock] load-failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }

      if (!Array.isArray(listings)) {
        console.warn("[ikyu-listing-mock] load-not-array");
        return [];
      }

      return listings.filter(isIkyuListing);
    },
  };
}

export const ikyuListingRepository: IkyuListingRepository =
  createIkyuListingRepository();

export function getIkyuListingRepository(): IkyuListingRepository {
  return ikyuListingRepository;
}
