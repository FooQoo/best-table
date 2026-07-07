// docs/MODEL.md「一休掲載店マスタ（IkyuListing）」: 一休.comレストランに掲載されている
// 店舗の一覧データ。店舗詳細ページ URL と、店舗同定（照合）に使う属性を持つ。
// mvp-cycle-6 ではモック fixture（app/mocks/ikyu-listings.ts）由来のみで、
// real データ接続（提携 API 等）は将来サイクル。

export type IkyuListing = {
  url: string;
  name: string;
  address: string | null;
  phone: string | null;
  placeId: string | null;
};

export function isIkyuListing(value: unknown): value is IkyuListing {
  if (typeof value !== "object" || value === null) return false;
  const l = value as Record<string, unknown>;

  if (typeof l.url !== "string" || l.url.length === 0) return false;
  if (typeof l.name !== "string" || l.name.length === 0) return false;
  if (l.address !== null && typeof l.address !== "string") return false;
  if (l.phone !== null && typeof l.phone !== "string") return false;
  if (l.placeId !== null && typeof l.placeId !== "string") return false;

  return true;
}
