import type { MatchTier, Restaurant } from "~/domain/models/restaurant";

export type EmphasisKey =
  | "room"
  | "quiet"
  | "prestige"
  | "service"
  | "access"
  | "budgetLabel";

export const EMPHASIS_LABELS: Record<EmphasisKey, string> = {
  room: "個室",
  quiet: "静かさ",
  prestige: "格式",
  service: "接客",
  access: "アクセス",
  budgetLabel: "予算",
};

// COUNTERPARTS は5種類あるが、docs/PLANS.md の受け入れ条件は exec/partner/boss の3パターンのみを
// 定義している。thanks/bond は暫定で partner 相当の重み（会話しやすさ・アクセス）を流用する。
// boss の「予算」重視は UoW-6 で Restaurant.budgetLabel を追加したことで解消し、
// docs/PLANS.md「社内上司フローでは、予算、落ち着き、使いやすさが強調される」のとおり
// 予算（budgetLabel）・落ち着き（quiet）・使いやすさ（access）を強調する。
const EMPHASIS_BY_COUNTERPART: Record<string, EmphasisKey[]> = {
  exec: ["room", "prestige", "service"],
  partner: ["quiet", "access"],
  boss: ["budgetLabel", "quiet", "access"],
  thanks: ["quiet", "access"],
  bond: ["quiet", "access"],
};

export function getEmphasisKeys(counterpartId: string | null): EmphasisKey[] {
  if (!counterpartId) return [];
  return EMPHASIS_BY_COUNTERPART[counterpartId] ?? [];
}

// ヒアリング「重視条件」（app/mocks/data.ts の PRIORITIES）のキーは
// EmphasisKey と命名が異なるため、マッチ度算出用に対応表を用意する。
// "other"（自由入力の重視条件）は評価フィールドと対応しないため含めない。
export const PRIORITY_TO_EMPHASIS: Partial<Record<string, EmphasisKey>> = {
  calm: "quiet",
  room: "room",
  prestige: "prestige",
  service: "service",
  access: "access",
  budget: "budgetLabel",
};

// マッチ度算出の対象にする評価フィールドを、相手種別の重み付けとユーザーが選んだ
// 重視条件の両方から決める（どちらかにあれば対象にする）。両方が空の場合
// （ヒアリング未入力など）は、全フィールドを対象にしてマッチ度が常に null に
// ならないようにする。
export function resolveEmphasisKeysForTier(input: {
  counterpartId: string | null;
  priorities: string[];
}): EmphasisKey[] {
  const fromCounterpart = getEmphasisKeys(input.counterpartId);
  const fromPriorities = input.priorities
    .map((priority) => PRIORITY_TO_EMPHASIS[priority])
    .filter((key): key is EmphasisKey => Boolean(key));

  const merged = [...new Set([...fromCounterpart, ...fromPriorities])];
  return merged.length > 0 ? merged : [...EMPHASIS_KEYS];
}

const EMPHASIS_KEYS: EmphasisKey[] = [
  "room",
  "quiet",
  "prestige",
  "service",
  "access",
  "budgetLabel",
];

// "¥20,000" や "¥20,000-¥30,000" のような AI 生成の自由文字列から、
// 先頭の金額（1人あたりの下限相当）を取り出す。パースできない場合や
// "指定なし" は null（不明として扱い、悪い判定にしない）。
export function parseBudgetYen(label: string | null): number | null {
  if (!label || label === "指定なし") return null;
  const match = label.match(/[\d,]+/);
  if (!match) return null;
  const value = Number.parseInt(match[0].replace(/,/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

// 0（不良）〜1（良好）の連続値。"unknown" は判定不能（データが無い）を表し、
// 0 として扱わない（データ欠如を低評価と混同しない）。
type FieldScore = number | "unknown";

function scoreRoom(room: Restaurant["room"]): FieldScore {
  if (room === null || room === "情報なし") return "unknown";
  switch (room) {
    case "個室あり":
      return 1;
    case "半個室あり":
      return 0.7;
    case "カウンターのみ":
      return 0.4;
    case "個室なし":
      return 0;
  }
}

function scoreRatingSymbol(value: "◎" | "○" | "△" | null): FieldScore {
  if (value === null) return "unknown";
  if (value === "◎") return 1;
  if (value === "○") return 0.6;
  return 0; // △
}

function scoreBudget(
  budgetLabel: string | null,
  budgetMin: string,
  budgetMax: string,
): FieldScore {
  if (budgetMin === "指定なし" && budgetMax === "指定なし") return "unknown";
  const value = parseBudgetYen(budgetLabel);
  if (value === null) return "unknown";
  const min = parseBudgetYen(budgetMin);
  const max = parseBudgetYen(budgetMax);
  if (min !== null && value < min) return 0;
  if (max !== null && value > max) return 0;
  return 1;
}

export type ComputeMatchTierInput = {
  restaurant: Pick<
    Restaurant,
    "room" | "quiet" | "prestige" | "service" | "budgetLabel"
  >;
  counterpartId: string | null;
  priorities: string[];
  budgetMin: string;
  budgetMax: string;
};

// "highest" は全ての判定対象が実質的に満点（◎・個室あり相当）のときだけに絞る。
// AI 評価は ◎/○ を寛容につけがちで、判定対象フィールドが少ない相手種別
// （例: partner は quiet 1件しか判定できない）だと「1件良好=highest」が
// 頻発してしまうため、判定対象フィールド数の下限も設ける。
const HIGHEST_MIN_AVERAGE = 0.85;
const HIGHEST_MIN_KNOWN_COUNT = 2;
const HIGH_MIN_AVERAGE = 0.6;
const MEDIUM_MIN_AVERAGE = 0.3;

// AI にマッチ度を生成させず、相手種別・重視条件・予算と AI 評価済みフィールド
// （room/quiet/prestige/service/budgetLabel）を照合してアプリ側で決定的に算出する。
// 根拠となるフィールドが1つも判定できない場合は捏造せず null を返す。
export function computeMatchTier(input: ComputeMatchTierInput): MatchTier | null {
  const keys = resolveEmphasisKeysForTier({
    counterpartId: input.counterpartId,
    priorities: input.priorities,
  });

  let knownCount = 0;
  let total = 0;

  for (const key of keys) {
    // access は自由文字列（駅名・徒歩分数の組み合わせが無数にある）で
    // 良否を機械的に判定できないため、マッチ度の算出対象からは常に除外する。
    if (key === "access") continue;

    const score: FieldScore =
      key === "room"
        ? scoreRoom(input.restaurant.room)
        : key === "budgetLabel"
          ? scoreBudget(input.restaurant.budgetLabel, input.budgetMin, input.budgetMax)
          : scoreRatingSymbol(input.restaurant[key]);

    if (score === "unknown") continue;
    knownCount += 1;
    total += score;
  }

  if (knownCount === 0) return null;

  const average = total / knownCount;
  if (average >= HIGHEST_MIN_AVERAGE && knownCount >= HIGHEST_MIN_KNOWN_COUNT) {
    return "highest";
  }
  if (average >= HIGH_MIN_AVERAGE) return "high";
  if (average >= MEDIUM_MIN_AVERAGE) return "medium";
  return "low";
}
