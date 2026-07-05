import { describe, expect, it } from "vitest";
import { resolvePhotoPlaceholderLabel } from "./photo-placeholder-label";

describe("resolvePhotoPlaceholderLabel", () => {
  it("labels rooms with 個室あり as 個室 写真", () => {
    expect(resolvePhotoPlaceholderLabel({ room: "個室あり" })).toBe("個室 写真");
  });

  it("labels 半個室あり as 個室 写真", () => {
    expect(resolvePhotoPlaceholderLabel({ room: "半個室あり" })).toBe("個室 写真");
  });

  it("labels カウンターのみ as カウンター写真", () => {
    expect(resolvePhotoPlaceholderLabel({ room: "カウンターのみ" })).toBe(
      "カウンター写真",
    );
  });

  it("falls back to 店内写真 for unknown or missing room info, without fabricating a room type", () => {
    expect(resolvePhotoPlaceholderLabel({ room: "個室なし" })).toBe("店内写真");
    expect(resolvePhotoPlaceholderLabel({ room: "情報なし" })).toBe("店内写真");
    expect(resolvePhotoPlaceholderLabel({ room: null })).toBe("店内写真");
  });
});
