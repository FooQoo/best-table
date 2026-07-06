export const DEFAULT_GEMINI_MODEL_ID = "gemini-3-flash-preview";

export const GEMINI_TEXT_SETTINGS = {
  temperature: 0.2,
  maxOutputTokens: 2048,
} as const;

export const GEMINI_STRUCTURED_SETTINGS = {
  temperature: 0,
  maxOutputTokens: 4096,
} as const;

export const GEMINI_SUGGESTIONS_SETTINGS = {
  temperature: 0.3,
  maxOutputTokens: 260,
  maxRetries: 0,
  timeout: 2500,
} as const;
