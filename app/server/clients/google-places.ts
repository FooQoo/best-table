export const GOOGLE_PLACES_DETAILS_FIELD_MASK = [
  "location",
  "formattedAddress",
  "shortFormattedAddress",
  "types",
  "viewport",
  "plusCode",
  "photos",
].join(",");

const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const DEFAULT_PHOTO_MAX_HEIGHT_PX = 640;

type FetchFn = typeof fetch;

export type PlaceDetailsResult = {
  location: { lat: number; lng: number } | null;
  address: string | null;
  shortAddress: string | null;
  photoName: string | null;
};

export type FetchPlaceDetailsOptions = {
  apiKey?: string;
  fetchFn?: FetchFn;
};

type PlaceDetailsResponse = {
  location?: {
    latitude?: unknown;
    longitude?: unknown;
  };
  formattedAddress?: unknown;
  shortFormattedAddress?: unknown;
  photos?: unknown;
};

function readServerApiKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY;
}

function normalizePlaceResourceName(placeId: string): string {
  return placeId.startsWith("places/") ? placeId : `places/${placeId}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function extractFirstPhotoName(photos: unknown): string | null {
  if (!Array.isArray(photos)) return null;
  for (const photo of photos) {
    if (typeof photo !== "object" || photo === null) continue;
    const name = (photo as Record<string, unknown>).name;
    if (typeof name === "string" && name.length > 0) return name;
  }
  return null;
}

export function toPlaceDetailsResult(
  response: PlaceDetailsResponse,
): PlaceDetailsResult {
  const latitude = response.location?.latitude;
  const longitude = response.location?.longitude;
  const location =
    isFiniteNumber(latitude) && isFiniteNumber(longitude)
      ? { lat: latitude, lng: longitude }
      : null;
  const shortAddress = firstNonEmptyString(response.shortFormattedAddress);

  return {
    location,
    address: firstNonEmptyString(response.formattedAddress, shortAddress),
    shortAddress,
    photoName: extractFirstPhotoName(response.photos),
  };
}

export function buildPlacePhotoMediaUrl(
  photoName: string,
  maxHeightPx = DEFAULT_PHOTO_MAX_HEIGHT_PX,
): string {
  const url = new URL(`${PLACES_API_BASE_URL}/${photoName}/media`);
  url.searchParams.set("maxHeightPx", String(maxHeightPx));
  url.searchParams.set("skipHttpRedirect", "true");
  return url.toString();
}

export async function fetchPlaceDetails(
  placeId: string | null,
  options: FetchPlaceDetailsOptions = {},
): Promise<PlaceDetailsResult | null> {
  const apiKey = options.apiKey ?? readServerApiKey();
  if (!placeId || !apiKey) return null;

  const fetchFn = options.fetchFn ?? fetch;
  const placeName = normalizePlaceResourceName(placeId);
  const url = new URL(`${PLACES_API_BASE_URL}/${placeName}`);
  url.searchParams.set("languageCode", "ja");
  url.searchParams.set("regionCode", "JP");

  try {
    const response = await fetchFn(url.toString(), {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_DETAILS_FIELD_MASK,
      },
    });

    if (!response.ok) return null;

    const json = (await response.json()) as PlaceDetailsResponse;
    return toPlaceDetailsResult(json);
  } catch {
    return null;
  }
}
