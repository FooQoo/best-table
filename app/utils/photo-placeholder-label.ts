import type { Restaurant } from "~/domain/models/restaurant";

// 実写真（Restaurant.photoUrl）が無い店舗向けの StorePhotoPlaceholder ラベル。
// 座席カテゴリという確認済み事実からのみ表現を選び、実在しない写真内容を語らない。
export function resolvePhotoPlaceholderLabel(
  restaurant: Pick<Restaurant, "room">,
): string {
  if (restaurant.room === "個室あり" || restaurant.room === "半個室あり") {
    return "個室 写真";
  }
  if (restaurant.room === "カウンターのみ") {
    return "カウンター写真";
  }
  return "店内写真";
}
