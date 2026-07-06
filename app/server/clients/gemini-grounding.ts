import { google } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import {
  DEFAULT_GEMINI_MODEL_ID,
  GEMINI_GROUNDING_SETTINGS,
} from "./gemini-models";

// docs/ARCHITECTURE.md「検索・評価型 a. グラウンディング呼び出し」の薄いラッパー。
// 自前で Google Maps Places API を呼ぶ tool は実装せず、Gemini の Google マップ
// グラウンディング（`google.tools.googleMaps`）に地理空間参照を任せる。

export type GroundingCandidate = {
  name: string;
  placeId: string | null;
  mapsUri: string | null;
  address: string | null;
  phone: string | null;
  mapsText: string | null;
};

export type GroundingSearchInput = {
  prompt: string;
  latLng: { latitude: number; longitude: number };
  model?: LanguageModel;
};

type GoogleGroundingMetadata = {
  groundingMetadata?: {
    groundingChunks?: unknown[];
  };
};

export async function searchRestaurantCandidates(
  input: GroundingSearchInput,
): Promise<GroundingCandidate[]> {
  const model = input.model ?? google(DEFAULT_GEMINI_MODEL_ID);
  const { text, providerMetadata } = await generateText({
    model,
    ...GEMINI_GROUNDING_SETTINGS,
    tools: { google_maps: google.tools.googleMaps({}) },
    providerOptions: {
      google: { retrievalConfig: { latLng: input.latLng } },
    },
    prompt: input.prompt,
  });

  const metadata = providerMetadata?.google as GoogleGroundingMetadata | undefined;
  const chunks = metadata?.groundingMetadata?.groundingChunks ?? [];

  const withoutAddress = chunks
    .map((chunk) => extractMapsChunk(chunk))
    .filter((c): c is Omit<GroundingCandidate, "address"> => c !== null);
  console.info("[gemini-grounding] response", {
    rawChunkCount: chunks.length,
    extractedCandidateCount: withoutAddress.length,
    textLength: text.length,
    sampleNames: withoutAddress.slice(0, 5).map((candidate) => candidate.name),
  });

  return withoutAddress.map((candidate) => ({
    ...candidate,
    address: extractAddressFromText(text, candidate.name),
  }));
}

function extractMapsChunk(
  chunk: unknown,
): Omit<GroundingCandidate, "address"> | null {
  if (typeof chunk !== "object" || chunk === null) return null;
  const maps = (chunk as Record<string, unknown>).maps;
  if (typeof maps !== "object" || maps === null) return null;
  const m = maps as Record<string, unknown>;
  if (typeof m.title !== "string" || m.title.length === 0) return null;
  return {
    name: m.title,
    placeId: typeof m.placeId === "string" ? m.placeId : null,
    mapsUri: typeof m.uri === "string" ? m.uri : null,
    phone: typeof m.text === "string" ? extractPhoneFromMapsText(m.text) : null,
    mapsText: typeof m.text === "string" ? m.text : null,
  };
}

const PHONE_PATTERN = /^\* \*\*Phone:\*\* (.+)$/m;

export function extractPhoneFromMapsText(text: string): string | null {
  const match = text.match(PHONE_PATTERN);
  return match?.[1]?.trim() || null;
}

// グラウンディングメタデータ自体には住所が含まれないため、応答本文の店舗名近傍から
// 住所らしき文字列をベストエフォートで抽出する（docs/ARCHITECTURE.md 155行目）。
// 一致しない場合は捏造せず null のままにする。
const ADDRESS_PATTERN = /(東京都|北海道|(?:京都|大阪)府|.{2,3}県)[^\n、。]{2,60}/;

export function extractAddressFromText(
  text: string,
  candidateName: string,
): string | null {
  const nameIndex = text.indexOf(candidateName);
  if (nameIndex === -1) return null;
  const windowEnd = text.indexOf("\n\n", nameIndex);
  const window = text.slice(
    nameIndex,
    windowEnd === -1 ? nameIndex + 400 : windowEnd,
  );
  const match = window.match(ADDRESS_PATTERN);
  return match ? match[0].trim() : null;
}
