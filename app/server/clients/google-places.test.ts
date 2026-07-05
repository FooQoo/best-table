import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_PLACES_DETAILS_FIELD_MASK,
  buildStorePhotoProxyPath,
  fetchPlaceDetails,
  fetchPlacePhotoMedia,
  toPlaceDetailsResult,
} from "./google-places";

describe("GOOGLE_PLACES_DETAILS_FIELD_MASK", () => {
  it("only requests fields needed for map rendering and representative photos", () => {
    const fields = GOOGLE_PLACES_DETAILS_FIELD_MASK.split(",");

    expect(fields).toEqual([
      "location",
      "formattedAddress",
      "shortFormattedAddress",
      "types",
      "viewport",
      "plusCode",
      "photos",
    ]);
    expect(fields).not.toContain("displayName");
    expect(fields).not.toContain("googleMapsUri");
    expect(fields).not.toContain("rating");
    expect(fields).not.toContain("reviews");
    expect(fields).not.toContain("regularOpeningHours");
  });
});

describe("toPlaceDetailsResult", () => {
  it("converts a Place Details response into Restaurant location/address/photo candidates", () => {
    const result = toPlaceDetailsResult({
      location: { latitude: 35.6717, longitude: 139.7639 },
      formattedAddress: "東京都中央区銀座5-5-11",
      shortFormattedAddress: "中央区銀座5-5-11",
      photos: [
        {
          name: "places/abc/photos/photo-1",
          widthPx: 1200,
          heightPx: 800,
        },
      ],
    });

    expect(result).toEqual({
      location: { lat: 35.6717, lng: 139.7639 },
      address: "東京都中央区銀座5-5-11",
      shortAddress: "中央区銀座5-5-11",
      photoName: "places/abc/photos/photo-1",
    });
  });

  it("falls back to short address and nulls when fields are missing or malformed", () => {
    const result = toPlaceDetailsResult({
      location: { latitude: "35.6", longitude: 139.7 },
      shortFormattedAddress: "銀座",
      photos: [{ name: "" }],
    });

    expect(result).toEqual({
      location: null,
      address: "銀座",
      shortAddress: "銀座",
      photoName: null,
    });
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

describe("fetchPlaceDetails", () => {
  it("calls Place Details with the safe FieldMask and server API key", async () => {
    const fetchFn = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          location: { latitude: 35.6717, longitude: 139.7639 },
          formattedAddress: "東京都中央区銀座5-5-11",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const result = await fetchPlaceDetails("places/abc", {
      apiKey: "server-key",
      fetchFn,
    });

    expect(result).not.toBeNull();
    expect(fetchFn).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/abc?languageCode=ja&regionCode=JP",
      {
        headers: {
          "X-Goog-Api-Key": "server-key",
          "X-Goog-FieldMask": GOOGLE_PLACES_DETAILS_FIELD_MASK,
        },
      },
    );
    expect(result?.location).toEqual({ lat: 35.6717, lng: 139.7639 });
    expect(result?.address).toBe("東京都中央区銀座5-5-11");
  });

  it("returns null instead of throwing for missing placeId, missing key, and HTTP failures", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 500 }));

    await expect(fetchPlaceDetails(null, { apiKey: "server-key", fetchFn })).resolves.toBeNull();
    await expect(fetchPlaceDetails("places/abc", { apiKey: "", fetchFn })).resolves.toBeNull();
    await expect(fetchPlaceDetails("places/abc", { apiKey: "server-key", fetchFn })).resolves.toBeNull();
  });
});
