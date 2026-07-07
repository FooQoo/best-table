// 検索結果の構造化評価（`app/server/clients/gemini-evaluation.ts`）専用のモデル。
// 最大20件をまとめて構造化出力するため、判断品質を優先する。
export const GEMINI_EVALUATION_MODEL_ID = "gemini-3.5-flash";
// 地図コンテキスト AI チャット（回答本文・おすすめ質問）専用のモデル。検索・評価ほど
// 複雑な構造化判断を必要とせず、低レイテンシ・低コストを優先する
// （`app/server/clients/gemini-results-chat.ts` / `gemini-results-chat-suggestions.ts`）。
export const GEMINI_CHAT_MODEL_ID = "gemini-3.1-flash-lite";

export const GEMINI_TEXT_SETTINGS = {
  temperature: 0.2,
  maxOutputTokens: 2048,
} as const;

export const GEMINI_STRUCTURED_SETTINGS = {
  temperature: 0,
  // 実測: 10件評価で maxOutputTokens: 4096 だと末尾2件が生成完了前に打ち切られ、
  // エラーにならないまま評価未生成として残っていた（Output.array の elementStream は
  // 完結しなかった要素を黙って落とす）。1ページ最大20件（restaurant-search.ts の
  // limit 上限）を余裕を持って収められる値にする。
  maxOutputTokens: 16_384,
  // ハング時に検索が無応答のまま終わらないよう上限を設ける。おすすめ質問生成ほど
  // 短くはできない（最大20件をまとめて構造化評価するため）ので、一定時間待った上で
  // 1回だけ再試行する。maxOutputTokens を上げた分、生成に時間がかかることも見込む。
  timeout: 45_000,
  maxRetries: 1,
} as const;

export const GEMINI_SUGGESTIONS_SETTINGS = {
  temperature: 0.3,
  maxOutputTokens: 260,
  maxRetries: 0,
  timeout: 2500,
} as const;
