import { describe, expect, it } from "vitest";
import {
  buildBookingConditionSummary,
  buildPlaceSearchQuery,
} from "./restaurant-search-query";

const baseCondition = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "指定なし",
  budgetMax: "指定なし",
  budgetOtherOn: false,
  budgetOtherText: "",
  priorities: ["room", "prestige"],
  priorityOtherOn: false,
  priorityOtherText: "",
  counterpart: "exec",
  counterpartOtherText: "",
};

describe("buildPlaceSearchQuery", () => {
  it("includes the selected area and short priority keywords", () => {
    const query = buildPlaceSearchQuery(baseCondition);
    expect(query).toContain("銀座");
    expect(query).toContain("接待");
    expect(query).toContain("レストラン");
    expect(query).toContain("個室");
    expect(query).toContain("高級");
  });

  it("omits keywords for priorities without a search-friendly term", () => {
    const query = buildPlaceSearchQuery({ ...baseCondition, priorities: ["budget"] });
    expect(query).toBe("銀座 接待 レストラン");
  });

  it("joins multiple selected areas", () => {
    const query = buildPlaceSearchQuery({
      ...baseCondition,
      selectedAreas: ["銀座", "六本木"],
      priorities: [],
    });
    expect(query).toBe("銀座・六本木 接待 レストラン");
  });

  it("omits selected area names when searching from the map center", () => {
    const query = buildPlaceSearchQuery({
      ...baseCondition,
      searchLatLng: { latitude: 35.6812, longitude: 139.7671 },
    });
    expect(query).toBe("接待 レストラン 個室 高級");
    expect(query).not.toContain("銀座");
  });
});

describe("buildBookingConditionSummary", () => {
  it("includes the selected areas, date, time, and party size", () => {
    const summary = buildBookingConditionSummary(baseCondition);
    expect(summary).toContain("銀座");
    expect(summary).toContain("2026-07-15");
    expect(summary).toContain("19:00");
    expect(summary).toContain("4名");
  });

  it("uses a map area label when searching from the map center", () => {
    const summary = buildBookingConditionSummary({
      ...baseCondition,
      searchLatLng: { latitude: 35.6812, longitude: 139.7671 },
    });
    expect(summary).toContain("地図の表示エリア");
    expect(summary).not.toContain("銀座エリア");
  });

  it("includes readable priority labels instead of raw keys", () => {
    const summary = buildBookingConditionSummary(baseCondition);
    expect(summary).toContain("個室・半個室を優先");
    expect(summary).toContain("失礼のない格式感");
    expect(summary).not.toContain("room");
  });

  it("includes the counterpart context", () => {
    const summary = buildBookingConditionSummary(baseCondition);
    expect(summary).toContain("重要顧客・役員クラスの接待");
  });

  it("includes free-text budget/priority/counterpart overrides when enabled", () => {
    const summary = buildBookingConditionSummary({
      ...baseCondition,
      counterpart: "other",
      counterpartOtherText: "取引先の海外拠点責任者",
      budgetOtherOn: true,
      budgetOtherText: "一人あたり4万円前後",
      priorityOtherOn: true,
      priorityOtherText: "個室からの眺望",
    });
    expect(summary).toContain("取引先の海外拠点責任者");
    expect(summary).toContain("一人あたり4万円前後");
    expect(summary).toContain("個室からの眺望");
  });

  it("does not fabricate a genre restriction when none is given", () => {
    const summary = buildBookingConditionSummary(baseCondition);
    expect(summary).not.toMatch(/ジャンル/);
  });
});
