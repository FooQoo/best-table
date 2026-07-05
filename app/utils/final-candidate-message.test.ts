import { describe, expect, it } from "vitest";
import { STORES } from "~/mocks/data";
import { buildFinalStoreMessage } from "./final-candidate-message";

describe("buildFinalStoreMessage", () => {
  it("推薦理由に店舗の recommendationReason を含める", () => {
    const store = STORES[0];
    const message = buildFinalStoreMessage(store, {
      counterpart: null,
      priorities: [],
    });
    expect(message.reason).toContain(store.recommendationReason);
  });

  it("相手種別に応じた重視観点を推薦理由の冒頭に含める", () => {
    const store = STORES[0];
    const message = buildFinalStoreMessage(store, {
      counterpart: "exec",
      priorities: [],
    });
    expect(message.reason).toContain("個室");
    expect(message.reason).toContain("格式");
    expect(message.reason).toContain("接客");
  });

  it("相手種別が未選択の場合は重視観点に言及しない", () => {
    const store = STORES[0];
    const message = buildFinalStoreMessage(store, {
      counterpart: null,
      priorities: [],
    });
    expect(message.reason.startsWith(store.recommendationReason)).toBe(true);
  });

  it("懸念タグを予約前の確認事項に含める", () => {
    const store = STORES.find((s) => s.concernTags.length > 0)!;
    const message = buildFinalStoreMessage(store, {
      counterpart: null,
      priorities: [],
    });
    for (const tag of store.concernTags) {
      expect(message.checksBeforeBooking).toContain(tag);
    }
  });

  it("空席状況・予約成立を断定しない確認事項を必ず含める", () => {
    const store = STORES[0];
    const message = buildFinalStoreMessage(store, {
      counterpart: null,
      priorities: [],
    });
    const joined = message.checksBeforeBooking.join(" ");
    expect(joined).not.toMatch(/空席あり|予約できます|予約確定/);
    expect(
      message.checksBeforeBooking.some((c) => c.includes("空席")),
    ).toBe(true);
  });

  it("確認事項は1件以上返す", () => {
    const store = STORES[0];
    const message = buildFinalStoreMessage(store, {
      counterpart: null,
      priorities: [],
    });
    expect(message.checksBeforeBooking.length).toBeGreaterThan(0);
  });
});
