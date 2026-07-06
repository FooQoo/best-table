import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import {
  extractPhoneFromMapsText,
  searchRestaurantCandidates,
} from "./gemini-grounding";

const SAMPLE_TEXT = `銀座エリアで接待・会食に利用できる個室のある和食レストランを5件ご紹介します。

1. 桂
2. 本格板前居酒屋 お魚総本家 銀座店`;

describe("extractPhoneFromMapsText", () => {
  it("extracts a phone number from Google Maps grounding text", () => {
    expect(extractPhoneFromMapsText("* **Phone:** 03-1234-5678")).toBe(
      "03-1234-5678",
    );
  });

  it("returns null when the phone line is missing", () => {
    expect(extractPhoneFromMapsText("* **Address:** Tokyo")).toBeNull();
  });
});

function mockModelReturning(
  providerMetadata: Record<string, Record<string, unknown>> | undefined,
) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: SAMPLE_TEXT }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
      // MockLanguageModelV4 の providerMetadata は JSONValue 制約の型だが、
      // このテストではグラウンディングメタデータの形だけを検証したいため緩めにキャストする。
      providerMetadata: providerMetadata as never,
    }),
  });
}

describe("searchRestaurantCandidates", () => {
  it("extracts maps grounding chunks into candidates with best-effort addresses", async () => {
    const model = mockModelReturning({
      google: {
        groundingMetadata: {
          groundingChunks: [
            {
              maps: {
                uri: "https://maps.google.com/?cid=1",
                title: "桂",
                placeId: "places/abc",
                text: "* **Phone:** 03-1234-5678",
              },
            },
            {
              maps: {
                uri: "https://maps.google.com/?cid=2",
                title: "本格板前居酒屋 お魚総本家 銀座店",
                placeId: "places/def",
              },
            },
          ],
        },
      },
    });

    const candidates = await searchRestaurantCandidates({
      model,
      prompt: "test prompt",
      latLng: { latitude: 35.6717, longitude: 139.7639 },
    });

    expect(candidates).toEqual([
      {
        name: "桂",
        placeId: "places/abc",
        mapsUri: "https://maps.google.com/?cid=1",
        phone: "03-1234-5678",
        mapsText: "* **Phone:** 03-1234-5678",
      },
      {
        name: "本格板前居酒屋 お魚総本家 銀座店",
        placeId: "places/def",
        mapsUri: "https://maps.google.com/?cid=2",
        phone: null,
        mapsText: null,
      },
    ]);
  });

  it("returns an empty array without fabricating candidates when grounding metadata is missing", async () => {
    const model = mockModelReturning(undefined);
    const candidates = await searchRestaurantCandidates({
      model,
      prompt: "test prompt",
      latLng: { latitude: 35.6717, longitude: 139.7639 },
    });
    expect(candidates).toEqual([]);
  });

  it("ignores non-maps grounding chunks", async () => {
    const model = mockModelReturning({
      google: {
        groundingMetadata: {
          groundingChunks: [{ web: { uri: "https://example.com", title: "Not a restaurant" } }],
        },
      },
    });
    const candidates = await searchRestaurantCandidates({
      model,
      prompt: "test prompt",
      latLng: { latitude: 35.6717, longitude: 139.7639 },
    });
    expect(candidates).toEqual([]);
  });
});
