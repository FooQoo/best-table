import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import {
  extractAddressFromText,
  searchRestaurantCandidates,
} from "./gemini-grounding";

const SAMPLE_TEXT = `銀座エリアで接待・会食に利用できる個室のある和食レストランを5件ご紹介します。

1.  **桂 (Katsura)**: 評価4.7 (60件のレビュー) の日本料理店です。東京都中央区銀座5-5-11 塚本不動産ビル 4Fにあります。上品なシーフードと伝統的な料理のセットメニューを提供しています。
2.  **本格板前居酒屋 お魚総本家 銀座店**: 評価4.6 (76件のレビュー) の居酒屋レストランです。東京都中央区銀座8-3 西土橋ビル1階・2階に位置しています。`;

describe("extractAddressFromText", () => {
  it("extracts the address near the candidate name", () => {
    expect(extractAddressFromText(SAMPLE_TEXT, "桂")).toBe(
      "東京都中央区銀座5-5-11 塚本不動産ビル 4Fにあります",
    );
  });

  it("returns null when the candidate name is not found in the text", () => {
    expect(extractAddressFromText(SAMPLE_TEXT, "存在しない店")).toBeNull();
  });

  it("returns null when no address-like pattern follows the name", () => {
    expect(extractAddressFromText("桂はとても良い店です。", "桂")).toBeNull();
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
            { maps: { uri: "https://maps.google.com/?cid=1", title: "桂", placeId: "places/abc" } },
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
        address: "東京都中央区銀座5-5-11 塚本不動産ビル 4Fにあります",
      },
      {
        name: "本格板前居酒屋 お魚総本家 銀座店",
        placeId: "places/def",
        mapsUri: "https://maps.google.com/?cid=2",
        address: "東京都中央区銀座8-3 西土橋ビル1階・2階に位置しています",
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
