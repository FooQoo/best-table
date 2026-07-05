import { describe, expect, it } from "vitest";
import {
  ALL_AREA_CITIES,
  AREA_COORDINATES,
  resolveAreaLatLng,
} from "~/constants/area-coordinates";

describe("AREA_COORDINATES", () => {
  it("covers every selectable city in AREA_REGIONS", () => {
    for (const city of ALL_AREA_CITIES) {
      expect(AREA_COORDINATES[city], `missing coordinates for ${city}`).toBeDefined();
    }
  });
});

describe("resolveAreaLatLng", () => {
  it("resolves the coordinates of the first selected area found in the table", () => {
    expect(resolveAreaLatLng(["銀座", "六本木"])).toEqual(
      AREA_COORDINATES["銀座"],
    );
  });

  it("skips unknown areas and resolves the next known one", () => {
    expect(resolveAreaLatLng(["未知のエリア", "神戸"])).toEqual(
      AREA_COORDINATES["神戸"],
    );
  });

  it("returns null when no selected area is known, without inventing coordinates", () => {
    expect(resolveAreaLatLng(["未知のエリア"])).toBeNull();
  });

  it("returns null for an empty selection", () => {
    expect(resolveAreaLatLng([])).toBeNull();
  });
});
