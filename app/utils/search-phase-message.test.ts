import { describe, expect, it } from "vitest";
import { getSearchPhaseMessage } from "./search-phase-message";

describe("getSearchPhaseMessage", () => {
  it("returns the condition-check message before the request reaches the server", () => {
    expect(getSearchPhaseMessage("condition", 0)).toBe(
      "検索条件を確認しています…",
    );
  });

  it("returns the searching message while candidate stores are being found", () => {
    expect(getSearchPhaseMessage("searching", 0)).toBe(
      "周辺の候補店舗を検索しています…",
    );
  });

  it("returns the evaluating message without a count when nothing has arrived yet", () => {
    expect(getSearchPhaseMessage("evaluating", 0)).toBe(
      "AIが店舗を評価しています…",
    );
  });

  it("includes the running count once restaurants start arriving during evaluation", () => {
    expect(getSearchPhaseMessage("evaluating", 3)).toBe(
      "AIが店舗を評価しています…（3件完了）",
    );
  });
});
