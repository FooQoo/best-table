import { z } from "zod";

// docs/ARCHITECTURE.md「検索・評価型 b. 構造化評価呼び出し」で generateObject に渡すスキーマ。
// Restaurant 型の AI 生成部分（Google 由来フィールドは含まない）に対応する。
// z.union / z.record は Google の構造化出力で未サポートのため使わない
// （node_modules/@ai-sdk/google/docs/15-google.mdx「Troubleshooting: Schema Limitations」）。
const evidenceCategorySchema = z.enum([
  "photo",
  "seat",
  "menu",
  "access",
  "description",
]);

const concernItemSchema = z.object({
  text: z.string().describe("懸念点を一文で。断定せず、確認を促す表現にする。"),
  evidence: z.array(evidenceCategorySchema),
});

export const restaurantEvaluationItemSchema = z.object({
  // 候補名の文字列一致に頼ると、AIが表記を微妙に変えて返した場合や同名店舗が
  // 複数ある場合に取りこぼす（サーバー側の突合バグの原因になっていた）。
  // 入力プロンプトの番号（1始まり）をそのまま返させ、インデックスで突合する。
  candidateIndex: z
    .number()
    .int()
    .describe("評価対象の候補番号。入力候補一覧の番号（1始まり）とそのまま一致させる。"),
  candidateName: z
    .string()
    .describe("評価対象の店舗名。ログ・デバッグ用途。突合には candidateIndex を使う。"),
  room: z
    .enum(["個室あり", "半個室あり", "カウンターのみ", "個室なし", "情報なし"])
    .nullable(),
  quiet: z.enum(["◎", "○", "△"]).nullable().describe("静かさの評価"),
  prestige: z.enum(["◎", "○", "△"]).nullable().describe("格式感の評価"),
  service: z.enum(["◎", "○", "△"]).nullable().describe("接客の評価"),
  access: z
    .string()
    .nullable()
    .describe(
      "アクセス案内。住所・近隣ランドマーク・駅名など根拠がある場合のみ、30文字程度で「銀座駅周辺」「新橋駅近く」のように短く書く。根拠がなければ null。",
    ),
  budgetLabel: z
    .string()
    .nullable()
    .describe('例: "¥20,000"。一人あたりの想定予算。根拠がなければ null。'),
  concerns: z
    .array(concernItemSchema)
    .describe("懸念点。存在しなければ空配列。捏造しない。"),
  matchingSummary: z
    .string()
    .nullable()
    .describe("この会食条件にどう合うかの短い説明。断定的な保証はしない。"),
  evidence: z
    .array(evidenceCategorySchema)
    .describe("評価の根拠カテゴリ。根拠がなければ空配列。"),
  confidence: z.enum(["high", "medium", "low"]).nullable(),
});

export const restaurantEvaluationSchema = z.object({
  evaluations: z.array(restaurantEvaluationItemSchema),
});

export type RestaurantEvaluationResult = z.infer<
  typeof restaurantEvaluationSchema
>["evaluations"][number];
