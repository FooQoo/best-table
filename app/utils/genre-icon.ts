import type { Genre } from "~/domain/models/restaurant";

// Material Symbols のアイコン名（"restaurant"、"ramen_dining" などのリガチャ名）。
// Restaurant.genre（固定語彙）ごとに1つ選ぶ。判断できないジャンルは AI 評価側で
// "other" にしているため、ここでも自由文からの推測はしない。
const GENRE_ICONS: Record<Genre, string> = {
  japanese: "ramen_dining",
  sushi: "set_meal",
  yakiniku: "outdoor_grill",
  noodles: "ramen_dining",
  chinese: "ramen_dining",
  western: "dinner_dining",
  bar: "local_bar",
  cafe: "local_cafe",
  bakery: "bakery_dining",
  other: "restaurant",
};

export const DEFAULT_GENRE_ICON = GENRE_ICONS.other;

export function getGenreIcon(genre: Genre | null): string {
  if (!genre) return DEFAULT_GENRE_ICON;
  return GENRE_ICONS[genre] ?? DEFAULT_GENRE_ICON;
}
