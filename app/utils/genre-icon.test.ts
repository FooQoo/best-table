import { describe, expect, it } from "vitest";
import { GENRES } from "~/domain/models/restaurant";
import { DEFAULT_GENRE_ICON, getGenreIcon } from "./genre-icon";

describe("getGenreIcon", () => {
  it("genre が null の場合は汎用アイコンを返す", () => {
    expect(getGenreIcon(null)).toBe(DEFAULT_GENRE_ICON);
  });

  it("other は汎用アイコンを返す", () => {
    expect(getGenreIcon("other")).toBe(DEFAULT_GENRE_ICON);
  });

  it("固定語彙のすべての genre に対してアイコン名を返す", () => {
    GENRES.forEach((genre) => {
      expect(typeof getGenreIcon(genre)).toBe("string");
      expect(getGenreIcon(genre).length).toBeGreaterThan(0);
    });
  });

  it.each([
    ["japanese", "ramen_dining"],
    ["sushi", "set_meal"],
    ["yakiniku", "outdoor_grill"],
    ["noodles", "ramen_dining"],
    ["chinese", "ramen_dining"],
    ["western", "dinner_dining"],
    ["bar", "local_bar"],
    ["cafe", "local_cafe"],
    ["bakery", "bakery_dining"],
  ] as const)("genre「%s」は %s を返す", (genre, expected) => {
    expect(getGenreIcon(genre)).toBe(expected);
  });
});
