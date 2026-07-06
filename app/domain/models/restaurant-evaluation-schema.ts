import { z } from "zod";

// docs/ARCHITECTURE.md「検索・評価型 b. 構造化評価呼び出し」で generateObject に渡すスキーマ。
// Restaurant 型の AI 生成部分（Google 由来フィールドは含まない）に対応する。
// z.union / z.record は Google の構造化出力で未サポートのため使わない
// （node_modules/@ai-sdk/google/docs/15-google.mdx「Troubleshooting: Schema Limitations」）。
const evidenceCategorySchema = z.enum([
  "review",
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

// app/domain/models/restaurant.ts の Genre と対応させる固定語彙。自由文にせず
// 判断が付かない場合は "other" にする（存在しないジャンルを捏造させない）。
const genreSchema = z
  .enum([
    "japanese",
    "sushi",
    "yakiniku",
    "noodles",
    "chinese",
    "western",
    "bar",
    "cafe",
    "bakery",
    "other",
  ])
  .nullable()
  .describe(
    "料理ジャンル。japanese: 和食・会席・懐石・割烹・京料理、sushi: 鮨・寿司、" +
      "yakiniku: 焼肉・焼鳥・鉄板焼・炭火焼、noodles: 蕎麦・うどん・ラーメン、" +
      "chinese: 中華、western: イタリアン・フレンチ・洋食・ステーキ、bar: バー・居酒屋、" +
      "cafe: カフェ・喫茶、bakery: パン・ベーカリー。" +
      "上記のどれにも当てはまらない、または判断できない場合は other。根拠がなければ null。",
  );

export const restaurantEvaluationItemSchema = z.object({
  candidateName: z
    .string()
    .describe("評価対象の店舗名。入力候補一覧の名称と完全に一致させる。"),
  genre: genreSchema,
  score: z
    .number()
    .nullable()
    .describe(
      "0〜100の整数スコア。接待・会食適性の総合評価。根拠が乏しい場合は null。",
    ),
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
