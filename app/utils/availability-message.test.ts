import { describe, expect, it } from "vitest";
import { AVAILABILITY_UNKNOWN_MESSAGE, getAvailabilityMessage } from "./availability-message";

// docs/MODEL.md: 実予約 API を呼ばないため、空席は常に「未確認」の留保表現を返す。
// docs/RELIABILITY.md「AI 回答で行わないこと」に列挙された断定表現を含まないことを担保する。
const BANNED_PHRASES = [
  "空いています",
  "予約可能です",
  "満席の心配はありません",
  "確実に空いて",
  "予約は確定",
];

describe("getAvailabilityMessage", () => {
  it("returns a non-empty reserved message", () => {
    expect(getAvailabilityMessage().length).toBeGreaterThan(0);
  });

  it("never asserts a confirmed vacancy or reservation", () => {
    const message = getAvailabilityMessage();
    BANNED_PHRASES.forEach((phrase) => {
      expect(message).not.toContain(phrase);
    });
  });

  it("always returns the same constant, regardless of restaurant data (no live source exists)", () => {
    expect(getAvailabilityMessage()).toBe(AVAILABILITY_UNKNOWN_MESSAGE);
  });
});
