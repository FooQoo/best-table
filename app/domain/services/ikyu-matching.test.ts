import { describe, expect, it } from "vitest";
import type { IkyuListing } from "~/domain/models/ikyu-listing";
import { matchIkyuListing } from "./ikyu-matching";

function buildListing(overrides: Partial<IkyuListing> = {}): IkyuListing {
  return {
    url: "https://restaurant.ikyu.com/100001/",
    name: "日本料理 花明かり",
    address: null,
    phone: "03-1234-5601",
    placeId: null,
    ...overrides,
  };
}

describe("matchIkyuListing", () => {
  it("placeId が一致する場合は matchedBy: placeId で一致する", () => {
    const listing = buildListing({ placeId: "places/abc" });
    const result = matchIkyuListing(
      { placeId: "places/abc", phone: null, name: "別名でもよい", address: null },
      [listing],
    );
    expect(result).toEqual({ url: listing.url, matchedBy: "placeId" });
  });

  it("placeId が無く電話番号（正規化後）が一致する場合は matchedBy: phone で一致する", () => {
    const listing = buildListing({ phone: "03-1234-5601" });
    const result = matchIkyuListing(
      { placeId: null, phone: "03-1234-5601", name: "別名", address: null },
      [listing],
    );
    expect(result).toEqual({ url: listing.url, matchedBy: "phone" });
  });

  it("電話番号の表記ゆれ（ハイフン有無）を正規化して一致させる", () => {
    const listing = buildListing({ phone: "0312345601" });
    const result = matchIkyuListing(
      { placeId: null, phone: "03-1234-5601", name: "別名", address: null },
      [listing],
    );
    expect(result).toEqual({ url: listing.url, matchedBy: "phone" });
  });

  it("placeId・電話番号が無く店名+住所が一致する場合は matchedBy: name-address で一致する", () => {
    const listing = buildListing({
      phone: null,
      address: "東京都中央区銀座1-1-1",
    });
    const result = matchIkyuListing(
      {
        placeId: null,
        phone: null,
        name: "日本料理 花明かり",
        address: "東京都中央区銀座1-1-1",
      },
      [listing],
    );
    expect(result).toEqual({ url: listing.url, matchedBy: "name-address" });
  });

  it("どのキーも一致しない場合は null を返す", () => {
    const listing = buildListing();
    const result = matchIkyuListing(
      { placeId: "places/other", phone: "03-9999-9999", name: "別店舗", address: "別住所" },
      [listing],
    );
    expect(result).toBeNull();
  });

  it("候補と一休掲載店の placeId が両方あり異なる場合は、電話番号が一致しても null を返す（矛盾を一致とみなさない）", () => {
    const listing = buildListing({ placeId: "places/ikyu-1", phone: "03-1234-5601" });
    const result = matchIkyuListing(
      { placeId: "places/different", phone: "03-1234-5601", name: "同じ電話番号の別店", address: null },
      [listing],
    );
    expect(result).toBeNull();
  });

  it("電話番号が両方あり異なる場合は、店名+住所が一致しても null を返す（矛盾を一致とみなさない）", () => {
    const listing = buildListing({
      phone: "03-1234-5601",
      address: "東京都中央区銀座1-1-1",
    });
    const result = matchIkyuListing(
      {
        placeId: null,
        phone: "03-9999-9999",
        name: "日本料理 花明かり",
        address: "東京都中央区銀座1-1-1",
      },
      [listing],
    );
    expect(result).toBeNull();
  });

  it("マスタが空配列の場合は null を返す", () => {
    const result = matchIkyuListing(
      { placeId: "places/abc", phone: "03-1234-5601", name: "店", address: null },
      [],
    );
    expect(result).toBeNull();
  });
});
