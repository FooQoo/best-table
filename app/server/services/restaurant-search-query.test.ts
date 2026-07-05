import { describe, expect, it } from "vitest";
import { buildGroundingPrompt } from "./restaurant-search-query";

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

describe("buildGroundingPrompt", () => {
  it("includes the selected areas, date, time, and party size", () => {
    const prompt = buildGroundingPrompt(baseCondition);
    expect(prompt).toContain("銀座");
    expect(prompt).toContain("2026-07-15");
    expect(prompt).toContain("19:00");
    expect(prompt).toContain("4名");
  });

  it("includes readable priority labels instead of raw keys", () => {
    const prompt = buildGroundingPrompt(baseCondition);
    expect(prompt).toContain("個室・半個室を優先");
    expect(prompt).toContain("失礼のない格式感");
    expect(prompt).not.toContain("room");
  });

  it("includes the counterpart context", () => {
    const prompt = buildGroundingPrompt(baseCondition);
    expect(prompt).toContain("重要顧客・役員クラスの接待");
  });

  it("includes free-text budget/priority/counterpart overrides when enabled", () => {
    const prompt = buildGroundingPrompt({
      ...baseCondition,
      counterpart: "other",
      counterpartOtherText: "取引先の海外拠点責任者",
      budgetOtherOn: true,
      budgetOtherText: "一人あたり4万円前後",
      priorityOtherOn: true,
      priorityOtherText: "個室からの眺望",
    });
    expect(prompt).toContain("取引先の海外拠点責任者");
    expect(prompt).toContain("一人あたり4万円前後");
    expect(prompt).toContain("個室からの眺望");
  });

  it("does not fabricate a genre restriction when none is given", () => {
    const prompt = buildGroundingPrompt(baseCondition);
    expect(prompt).not.toMatch(/ジャンル/);
  });

  it("asks for up to 30 candidates without padding", () => {
    const prompt = buildGroundingPrompt(baseCondition);
    expect(prompt).toContain("30");
  });

  it("asks for restaurant names in Japanese, not English or translated", () => {
    const prompt = buildGroundingPrompt(baseCondition);
    expect(prompt).toContain("日本語の正式名称");
  });
});
