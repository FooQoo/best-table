import { describe, expect, it } from "vitest";
import { getEmphasisKeys } from "./scoring";

describe("getEmphasisKeys", () => {
  it("重要顧客・役員クラスの接待では個室・格式・接客を強調する", () => {
    expect(getEmphasisKeys("exec")).toEqual(["room", "prestige", "service"]);
  });

  it("初回の取引先・商談前後では会話しやすさ・アクセスを強調する", () => {
    expect(getEmphasisKeys("partner")).toEqual(["quiet", "access"]);
  });

  it("社内上司・幹部との会食では予算・落ち着き・使いやすさを強調する", () => {
    expect(getEmphasisKeys("boss")).toEqual(["budgetLabel", "quiet", "access"]);
  });

  it("お礼・懇親の食事では初回取引先相当の重みを暫定で使う", () => {
    expect(getEmphasisKeys("thanks")).toEqual(["quiet", "access"]);
  });

  it("関係を深めたい相手との会食では初回取引先相当の重みを暫定で使う", () => {
    expect(getEmphasisKeys("bond")).toEqual(["quiet", "access"]);
  });

  it("相手種別が未選択の場合は何も強調しない", () => {
    expect(getEmphasisKeys(null)).toEqual([]);
  });

  it("未知の相手種別IDの場合は何も強調しない", () => {
    expect(getEmphasisKeys("unknown-id")).toEqual([]);
  });
});
