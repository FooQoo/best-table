import { describe, expect, it } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import {
  buildResultsChatPrompt,
  buildResultsChatSuggestionsPrompt,
} from "./results-chat-prompt";

const bookingSummary: ResultsChatBookingSummary = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "¥10,000",
  budgetMax: "¥20,000",
  budgetOtherOn: false,
  budgetOtherText: "",
  priorities: ["room", "service"],
  priorityOtherOn: false,
  priorityOtherText: "",
  counterpart: "exec",
  counterpartOtherText: "",
};

const restaurants = [
  {
    id: "a",
    placeId: "places/a",
    name: "銀座 接待店 A",
    area: "銀座",
    address: "東京都中央区銀座1-1-1",
    location: { lat: 35.1, lng: 139.1 },
    phone: null,
    photoUrl: null,
    genre: "japanese",
    matchTier: "high",
    room: "個室あり",
    quiet: "◎",
    prestige: "◎",
    service: "○",
    access: "銀座駅から徒歩3分",
    budgetLabel: "¥15,000前後",
    concerns: [{ text: "人気店のため事前確認が必要", evidence: ["review"] }],
    matchingSummary: "個室と格式のバランスが良い候補です。",
    evidence: ["review", "seat"],
    confidence: "medium",
    generatedAt: "2026-07-05T00:00:00.000Z",
  },
] as Restaurant[];

describe("buildResultsChatPrompt", () => {
  it("grounds the answer in visible restaurants and hearing conditions", () => {
    const prompt = buildResultsChatPrompt({
      question: "比較に入れるべき店は？",
      restaurants,
      bookingSummary,
    });

    expect(prompt).toContain("銀座 接待店 A");
    expect(prompt).toContain("重要顧客・役員クラスの接待");
    expect(prompt).toContain("個室・半個室を優先");
    expect(prompt).toContain("接客の安定感");
    expect(prompt).toContain("表示中店舗とヒアリング条件だけ");
  });

  it("instructs the model not to guarantee availability or unavailable facts", () => {
    const prompt = buildResultsChatPrompt({
      question: "予約できますか？",
      restaurants,
      bookingSummary,
    });

    expect(prompt).toContain("空席、予約成立、予約可否、在庫");
    expect(prompt).toContain("未取得の口コミ本文");
    expect(prompt).toContain("未取得のメニュー本文");
  });
});

describe("buildResultsChatSuggestionsPrompt", () => {
  it("grounds follow-up question generation in the prior question, answer, and store names", () => {
    const prompt = buildResultsChatSuggestionsPrompt({
      question: "比較に入れるべき店は？",
      answer: "銀座 接待店 A を中心に見ると判断しやすいです。",
      restaurants,
    });

    expect(prompt).toContain("銀座 接待店 A を中心に見ると判断しやすいです。");
    expect(prompt).toContain("比較に入れるべき店は？");
    expect(prompt).toContain("- 銀座 接待店 A");
    expect(prompt).toContain("質問を4つ");
    expect(prompt).toContain("ユーザーがAIに尋ねる質問");
  });

  it("keeps the prompt to conversation history and store names only", () => {
    const prompt = buildResultsChatSuggestionsPrompt({
      question: "比較に入れるべき店は？",
      answer: "銀座 接待店 A を中心に見ると判断しやすいです。",
      restaurants,
    });

    expect(prompt).not.toContain("ヒアリング条件");
    expect(prompt).not.toContain("マッチ度");
  });

  it("instructs the model not to assume availability or unlisted restaurants", () => {
    const prompt = buildResultsChatSuggestionsPrompt({
      question: "予約できますか？",
      answer: "空席や予約成立はこの画面では確認できません。",
      restaurants,
    });

    expect(prompt).toContain("空席、予約成立、予約可否、在庫を前提にした質問にしない");
    expect(prompt).toContain("表示中店舗に含まれない店舗を前提にした質問にしない");
  });
});
