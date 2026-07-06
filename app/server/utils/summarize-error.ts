// ログ出力用にエラーを安全な形へ要約する共通関数。
// app/server/services/restaurant-search.ts と /api/restaurants/search* の resource route
// で同一実装が重複していたため、ここへ集約する。
export function summarizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause:
        error.cause instanceof Error
          ? { name: error.cause.name, message: error.cause.message }
          : undefined,
    };
  }
  return { message: String(error) };
}
