import { describe, expect, it } from "vitest";
import { STORES } from "~/mocks/data";
import { buildStoreQA } from "./store-qa";

const BANNED_PHRASES = ["確実に空いて", "予約は確定", "満席の心配はありません"];

describe("buildStoreQA", () => {
  it("空でない質問応答例を返す", () => {
    const qa = buildStoreQA(STORES[0]);
    expect(qa.length).toBeGreaterThan(0);
    qa.forEach((item) => {
      expect(item.question.length).toBeGreaterThan(0);
      expect(item.answer.length).toBeGreaterThan(0);
    });
  });

  it("空席・予約成立を断定する表現を含まない", () => {
    STORES.forEach((store) => {
      const qa = buildStoreQA(store);
      qa.forEach((item) => {
        BANNED_PHRASES.forEach((phrase) => {
          expect(item.answer).not.toContain(phrase);
        });
      });
    });
  });

  it("懸念タグがある店舗では、回答のいずれかに懸念内容が反映される", () => {
    const storeWithConcern = STORES.find((s) => s.concernTags.length > 0)!;
    const qa = buildStoreQA(storeWithConcern);
    const mentionsConcern = qa.some((item) =>
      storeWithConcern.concernTags.some((tag) => item.answer.includes(tag)),
    );
    expect(mentionsConcern).toBe(true);
  });
});
