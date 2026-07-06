import { describe, expect, it } from "vitest";
import {
  computeMatchTier,
  getEmphasisKeys,
  parseBudgetYen,
  resolveEmphasisKeysForTier,
} from "./scoring";

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

describe("resolveEmphasisKeysForTier", () => {
  it("相手種別由来と重視条件由来のキーを重複排除して統合する", () => {
    expect(
      resolveEmphasisKeysForTier({ counterpartId: "exec", priorities: ["calm", "room"] }),
    ).toEqual(["room", "prestige", "service", "quiet"]);
  });

  it("相手種別のみでもキーを返す", () => {
    expect(resolveEmphasisKeysForTier({ counterpartId: "partner", priorities: [] })).toEqual([
      "quiet",
      "access",
    ]);
  });

  it("重視条件のみでもキーを返す", () => {
    expect(
      resolveEmphasisKeysForTier({ counterpartId: null, priorities: ["budget"] }),
    ).toEqual(["budgetLabel"]);
  });

  it("重視条件の対応表にない値（other など）は無視する", () => {
    expect(
      resolveEmphasisKeysForTier({ counterpartId: "partner", priorities: ["other"] }),
    ).toEqual(["quiet", "access"]);
  });

  it("相手種別・重視条件のどちらも無い場合は全フィールドにフォールバックする", () => {
    expect(resolveEmphasisKeysForTier({ counterpartId: null, priorities: [] })).toEqual([
      "room",
      "quiet",
      "prestige",
      "service",
      "access",
      "budgetLabel",
    ]);
  });
});

describe("parseBudgetYen", () => {
  it("単一の金額文字列から数値を取り出す", () => {
    expect(parseBudgetYen("¥20,000")).toBe(20000);
  });

  it("範囲表記は先頭（下限相当）の数値を取り出す", () => {
    expect(parseBudgetYen("¥20,000-¥30,000")).toBe(20000);
  });

  it("指定なし・null・パース不能な文字列は null", () => {
    expect(parseBudgetYen("指定なし")).toBeNull();
    expect(parseBudgetYen(null)).toBeNull();
    expect(parseBudgetYen("応相談")).toBeNull();
  });
});

describe("computeMatchTier", () => {
  const baseRestaurant = {
    room: "個室あり" as const,
    quiet: "◎" as const,
    prestige: "◎" as const,
    service: "◎" as const,
    budgetLabel: "¥20,000",
  };

  it("強調フィールドがすべて良好な場合は highest", () => {
    expect(
      computeMatchTier({
        restaurant: baseRestaurant,
        counterpartId: "exec",
        priorities: [],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBe("highest");
  });

  it("強調フィールドが半分以上良好な場合は high", () => {
    // exec の強調フィールドは room/prestige/service の3件。うち2件（room, prestige）が
    // 良好、1件（service）が不良 → ratio = 2/3 (>=0.5) で high。
    expect(
      computeMatchTier({
        restaurant: { ...baseRestaurant, service: "△" },
        counterpartId: "exec",
        priorities: [],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBe("high");
  });

  it("強調フィールドが一部だけ良好な場合は medium", () => {
    expect(
      computeMatchTier({
        restaurant: { ...baseRestaurant, room: "個室なし", prestige: "△" },
        counterpartId: "exec",
        priorities: [],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBe("medium");
  });

  it("強調フィールドが1つも良好でない場合は low", () => {
    expect(
      computeMatchTier({
        restaurant: { ...baseRestaurant, room: "個室なし", prestige: "△", service: "△" },
        counterpartId: "exec",
        priorities: [],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBe("low");
  });

  it("評価データが1件も判定できない場合は捏造せず null", () => {
    expect(
      computeMatchTier({
        restaurant: {
          room: null,
          quiet: null,
          prestige: null,
          service: null,
          budgetLabel: null,
        },
        counterpartId: "exec",
        priorities: [],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBeNull();
  });

  it("予算が範囲内なら budgetLabel は満点として扱われる", () => {
    expect(
      computeMatchTier({
        restaurant: { room: null, quiet: null, prestige: null, service: null, budgetLabel: "¥20,000" },
        counterpartId: null,
        priorities: ["budget"],
        budgetMin: "¥15,000",
        budgetMax: "¥30,000",
      }),
    ).toBe("high");
  });

  it("予算が範囲外なら budgetLabel は0点として扱われる", () => {
    expect(
      computeMatchTier({
        restaurant: { room: null, quiet: null, prestige: null, service: null, budgetLabel: "¥50,000" },
        counterpartId: null,
        priorities: ["budget"],
        budgetMin: "¥15,000",
        budgetMax: "¥30,000",
      }),
    ).toBe("low");
  });

  it("判定できたフィールドが1件だけの場合、満点でも highest には届かない（最高は2件以上の裏付けが必要）", () => {
    expect(
      computeMatchTier({
        restaurant: { room: null, quiet: "◎", prestige: null, service: null, budgetLabel: null },
        counterpartId: "partner",
        priorities: [],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBe("high");
  });

  it("○（そこそこ良好）だけでは highest の基準（平均0.85以上）に届かない", () => {
    expect(
      computeMatchTier({
        restaurant: {
          room: "個室あり",
          quiet: "○",
          prestige: "○",
          service: "○",
          budgetLabel: null,
        },
        counterpartId: "exec",
        priorities: [],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBe("high");
  });

  it("access のみが強調条件でも判定対象がなければ null（access は採点対象外）", () => {
    expect(
      computeMatchTier({
        restaurant: { room: null, quiet: null, prestige: null, service: null, budgetLabel: null },
        counterpartId: null,
        priorities: ["access"],
        budgetMin: "指定なし",
        budgetMax: "指定なし",
      }),
    ).toBeNull();
  });
});
