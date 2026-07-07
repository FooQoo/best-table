import { describe, expect, it } from "vitest";
import type { IkyuListing } from "~/domain/models/ikyu-listing";
import { createIkyuListingRepository } from "./ikyu-listing-repository";

function buildListing(overrides: Partial<IkyuListing> = {}): IkyuListing {
  return {
    url: "https://restaurant.ikyu.com/999999/",
    name: "テスト店",
    address: null,
    phone: "03-0000-0000",
    placeId: null,
    ...overrides,
  };
}

describe("createIkyuListingRepository", () => {
  it("読み込んだ一休掲載店マスタをそのまま返す", async () => {
    const listing = buildListing();
    const repository = createIkyuListingRepository(() => [listing]);

    expect(await repository.list()).toEqual([listing]);
  });

  it("読み込みが例外を投げた場合は空配列にフォールバックする（検索自体は失敗させない）", async () => {
    const repository = createIkyuListingRepository(() => {
      throw new Error("boom");
    });

    expect(await repository.list()).toEqual([]);
  });

  it("配列でないデータが返った場合は空配列にフォールバックする", async () => {
    const repository = createIkyuListingRepository(
      () => ({ not: "an array" }) as unknown as IkyuListing[],
    );

    expect(await repository.list()).toEqual([]);
  });

  it("IkyuListing の形状を満たさない要素は取り除く", async () => {
    const listing = buildListing();
    const repository = createIkyuListingRepository(
      () => [listing, { url: "" }, "not-an-object"] as unknown as IkyuListing[],
    );

    expect(await repository.list()).toEqual([listing]);
  });
});
