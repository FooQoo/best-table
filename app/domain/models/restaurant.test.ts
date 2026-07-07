import { describe, expect, it } from "vitest";
import {
  isRestaurant,
  MAX_COMPARE_COUNT,
  MAX_PRIORITY_COUNT,
  MIN_COMPARE_COUNT,
  type Restaurant,
} from "./restaurant";

function buildValidRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: "s1",
    placeId: null,
    name: "テスト店舗",
    genre: "japanese",
    area: "銀座",
    address: null,
    location: null,
    phone: null,
    photoUrl: null,
    matchTier: "highest",
    room: "個室あり",
    quiet: "◎",
    prestige: "◎",
    service: "◎",
    access: "銀座駅 徒歩3分",
    budgetLabel: "¥15,000",
    concerns: [{ text: "懸念テキスト", evidence: ["review"] }],
    matchingSummary: "マッチング要約",
    evidence: ["review", "photo"],
    confidence: "high",
    generatedAt: "2026-07-05T00:00:00.000Z",
    ikyu: null,
    ...overrides,
  };
}

describe("Restaurant 定数（docs/MODEL.md の固定語彙）", () => {
  it("比較候補の上限は5件", () => {
    expect(MAX_COMPARE_COUNT).toBe(5);
  });

  it("比較表示に必要な最小件数は2件", () => {
    expect(MIN_COMPARE_COUNT).toBe(2);
  });

  it("重視条件の上限は3件", () => {
    expect(MAX_PRIORITY_COUNT).toBe(3);
  });
});

describe("isRestaurant", () => {
  it("正しい形状の Restaurant を true と判定する", () => {
    expect(isRestaurant(buildValidRestaurant())).toBe(true);
  });

  it("AI 生成フィールドが未生成（null）でも true と判定する（データ不足を過信しない前提）", () => {
    const unresolved = buildValidRestaurant({
      matchTier: null,
      room: null,
      quiet: null,
      prestige: null,
      service: null,
      access: null,
      budgetLabel: null,
      matchingSummary: null,
      confidence: null,
      generatedAt: null,
      concerns: [],
      evidence: [],
    });
    expect(isRestaurant(unresolved)).toBe(true);
  });

  it("concerns の evidence に未知の固定語彙が含まれる場合は false", () => {
    const invalid = buildValidRestaurant({
      concerns: [{ text: "x", evidence: ["invalid-category" as never] }],
    });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("evidence 全体に未知の固定語彙が含まれる場合は false", () => {
    const invalid = buildValidRestaurant({
      evidence: ["invalid-category" as never],
    });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("confidence が固定語彙にない値の場合は false", () => {
    const invalid = buildValidRestaurant({ confidence: "very-high" as never });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("genre が固定語彙にない値の場合は false", () => {
    const invalid = buildValidRestaurant({ genre: "フレンチ" as never });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("genre が null の場合は true", () => {
    const unresolved = buildValidRestaurant({ genre: null });
    expect(isRestaurant(unresolved)).toBe(true);
  });

  it("matchTier が固定語彙にない値の場合は false", () => {
    const invalid = buildValidRestaurant({ matchTier: "perfect" as never });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("matchTier が null の場合は true", () => {
    const unresolved = buildValidRestaurant({ matchTier: null });
    expect(isRestaurant(unresolved)).toBe(true);
  });

  it("generatedAt が ISO日時としてパースできない場合は false", () => {
    const invalid = buildValidRestaurant({ generatedAt: "not-a-date" });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("id が空文字の場合は false", () => {
    const invalid = buildValidRestaurant({ id: "" });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("ikyu が null の場合は true（一休掲載店マスタと照合できなかった通常状態）", () => {
    const unresolved = buildValidRestaurant({ ikyu: null });
    expect(isRestaurant(unresolved)).toBe(true);
  });

  it("ikyu が正しい形状（url・matchedBy）を持つ場合は true", () => {
    const matched = buildValidRestaurant({
      ikyu: { url: "https://restaurant.ikyu.com/100001/", matchedBy: "phone" },
    });
    expect(isRestaurant(matched)).toBe(true);
  });

  it("ikyu.matchedBy が固定語彙にない値の場合は false", () => {
    const invalid = buildValidRestaurant({
      ikyu: { url: "https://restaurant.ikyu.com/100001/", matchedBy: "guess" as never },
    });
    expect(isRestaurant(invalid)).toBe(false);
  });

  it("ikyu フィールド自体が欠落している場合は false（必須フィールド）", () => {
    const restaurant = buildValidRestaurant();
    const withoutIkyu = { ...restaurant } as Partial<Restaurant>;
    delete withoutIkyu.ikyu;
    expect(isRestaurant(withoutIkyu)).toBe(false);
  });
});
