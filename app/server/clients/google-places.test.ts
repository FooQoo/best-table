import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_PLACES_SEARCH_FIELD_MASK,
  buildStorePhotoProxyPath,
  fetchPlacePhotoMedia,
  mapPlaceTypesToGenre,
  searchPlacesByText,
  toPlaceSearchCandidate,
} from "./google-places";

describe("GOOGLE_PLACES_SEARCH_FIELD_MASK", () => {
  it("only requests fields needed for the restaurant list, map, representative photo, and genre", () => {
    const fields = GOOGLE_PLACES_SEARCH_FIELD_MASK.split(",");

    expect(fields).toEqual([
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.nationalPhoneNumber",
      "places.photos",
      "places.primaryType",
      "places.types",
    ]);
    expect(fields).not.toContain("places.rating");
    expect(fields).not.toContain("places.userRatingCount");
    expect(fields).not.toContain("places.priceLevel");
    expect(fields).not.toContain("places.reviews");
    expect(fields).not.toContain("places.reviewSummary");
  });
});

describe("mapPlaceTypesToGenre", () => {
  it("maps a known primaryType directly", () => {
    expect(mapPlaceTypesToGenre("sushi_restaurant", [])).toBe("sushi");
  });

  it("falls back to scanning types when primaryType is unmapped", () => {
    expect(
      mapPlaceTypesToGenre("restaurant", ["restaurant", "yakiniku_restaurant", "food"]),
    ).toBe("yakiniku");
  });

  it("returns other instead of fabricating a genre when no known type matches", () => {
    expect(mapPlaceTypesToGenre("restaurant", ["restaurant", "food"])).toBe("other");
  });

  it("returns null when no type information is available at all", () => {
    expect(mapPlaceTypesToGenre(null, [])).toBeNull();
  });
});

describe("toPlaceSearchCandidate", () => {
  it("converts a Text Search place into a candidate with normalized placeId", () => {
    const result = toPlaceSearchCandidate({
      id: "abc123",
      displayName: { text: "桂", languageCode: "ja" },
      formattedAddress: "東京都中央区銀座5-5-11",
      location: { latitude: 35.6717, longitude: 139.7639 },
      nationalPhoneNumber: "03-1234-5678",
      photos: [{ name: "places/abc123/photos/photo-1", widthPx: 1200, heightPx: 800 }],
      primaryType: "japanese_restaurant",
      types: ["japanese_restaurant", "restaurant", "food"],
    });

    expect(result).toEqual({
      placeId: "places/abc123",
      name: "桂",
      address: "東京都中央区銀座5-5-11",
      location: { lat: 35.6717, lng: 139.7639 },
      phone: "03-1234-5678",
      photoName: "places/abc123/photos/photo-1",
      genre: "japanese",
    });
  });

  it("keeps an already-prefixed placeId as-is", () => {
    const result = toPlaceSearchCandidate({
      id: "places/abc123",
      displayName: { text: "桂" },
    });

    expect(result?.placeId).toBe("places/abc123");
  });

  it("falls back to nulls when optional fields are missing or malformed", () => {
    const result = toPlaceSearchCandidate({
      id: "abc123",
      displayName: { text: "桂" },
      location: { latitude: "35.6", longitude: 139.7 },
      photos: [{ name: "" }],
    });

    expect(result).toEqual({
      placeId: "places/abc123",
      name: "桂",
      address: null,
      location: null,
      phone: null,
      photoName: null,
      genre: null,
    });
  });

  it("returns null when the place has no id or no display name", () => {
    expect(toPlaceSearchCandidate({ displayName: { text: "桂" } })).toBeNull();
    expect(toPlaceSearchCandidate({ id: "abc123" })).toBeNull();
    expect(toPlaceSearchCandidate(null)).toBeNull();
  });
});

describe("searchPlacesByText", () => {
  it("calls Text Search with the field mask, server API key, and location bias", async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          places: [
            {
              id: "abc123",
              displayName: { text: "桂" },
              formattedAddress: "東京都中央区銀座5-5-11",
              location: { latitude: 35.6717, longitude: 139.7639 },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const candidates = await searchPlacesByText(
      {
        textQuery: "銀座 接待 レストラン",
        latLng: { latitude: 35.6717, longitude: 139.7639 },
      },
      { apiKey: "server-key", fetchFn },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchText",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "server-key",
          "X-Goog-FieldMask": GOOGLE_PLACES_SEARCH_FIELD_MASK,
        }),
      }),
    );
    const body = JSON.parse(vi.mocked(fetchFn).mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      textQuery: "銀座 接待 レストラン",
      includedType: "restaurant",
      pageSize: 20,
      locationBias: {
        circle: {
          center: { latitude: 35.6717, longitude: 139.7639 },
          radius: 3000,
        },
      },
    });
    expect(candidates).toEqual([
      {
        placeId: "places/abc123",
        name: "桂",
        address: "東京都中央区銀座5-5-11",
        location: { lat: 35.6717, lng: 139.7639 },
        phone: null,
        photoName: null,
        genre: null,
      },
    ]);
  });

  it("returns an empty array instead of throwing for missing key, HTTP failures, or malformed responses", async () => {
    const fetchFn = vi.fn(async () => new Response("not json", { status: 500 }));

    await expect(
      searchPlacesByText(
        { textQuery: "test", latLng: { latitude: 0, longitude: 0 } },
        { apiKey: "", fetchFn },
      ),
    ).resolves.toEqual([]);
    await expect(
      searchPlacesByText(
        { textQuery: "test", latLng: { latitude: 0, longitude: 0 } },
        { apiKey: "server-key", fetchFn },
      ),
    ).resolves.toEqual([]);
  });

  it("does not fabricate candidates when the response has no places", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));

    const candidates = await searchPlacesByText(
      { textQuery: "test", latLng: { latitude: 0, longitude: 0 } },
      { apiKey: "server-key", fetchFn },
    );
    expect(candidates).toEqual([]);
  });
});

describe("buildStorePhotoProxyPath", () => {
  it("builds a same-origin proxy path so the server API key is never sent to the client", () => {
    expect(buildStorePhotoProxyPath("places/abc/photos/photo-1")).toBe(
      "/api/photos/places/abc/photos/photo-1",
    );
  });
});

describe("fetchPlacePhotoMedia", () => {
  it("fetches the photo media with the server API key and returns the response", async () => {
    const imageResponse = new Response("binary", {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
    const fetchFn = vi.fn(async () => imageResponse);

    const result = await fetchPlacePhotoMedia("places/abc/photos/photo-1", {
      apiKey: "server-key",
      fetchFn,
    });

    expect(result).toBe(imageResponse);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/abc/photos/photo-1/media?maxHeightPx=640",
      { headers: { "X-Goog-Api-Key": "server-key" } },
    );
  });

  it("returns null instead of throwing for missing key, malformed photo names, and HTTP failures", async () => {
    const fetchFn = vi.fn(async () => new Response("", { status: 500 }));

    await expect(
      fetchPlacePhotoMedia("places/abc/photos/photo-1", { apiKey: "", fetchFn }),
    ).resolves.toBeNull();
    await expect(
      fetchPlacePhotoMedia("not-a-photo-name", { apiKey: "server-key", fetchFn }),
    ).resolves.toBeNull();
    await expect(
      fetchPlacePhotoMedia("places/../../etc/passwd/photos/x", {
        apiKey: "server-key",
        fetchFn,
      }),
    ).resolves.toBeNull();
    await expect(
      fetchPlacePhotoMedia("places/abc/photos/photo-1", { apiKey: "server-key", fetchFn }),
    ).resolves.toBeNull();
  });
});
