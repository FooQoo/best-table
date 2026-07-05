import { z } from "zod";

// docs/ARCHITECTURE.md「地図コンテキスト AI 相談」: 回答後のおすすめ質問を
// generateObject（構造化出力）で生成するためのスキーマ。
export const resultsChatSuggestionsSchema = z.object({
  questions: z
    .array(
      z
        .string()
        .describe(
          "ユーザーがAIにさらに尋ねる一人称の深掘り質問。AIがユーザーに聞き返す形にしない。40文字程度までの短さにする。",
        ),
    )
    .length(4)
    .describe(
      "直前の質問・回答を踏まえた、ユーザー視点の次のおすすめ質問4件。表示中店舗にない店舗を前提にせず、" +
        "空席・予約成立・在庫を前提にした質問にしない。4件はそれぞれ異なる観点にする。",
    ),
});

export type ResultsChatSuggestionsResult = z.infer<
  typeof resultsChatSuggestionsSchema
>;
