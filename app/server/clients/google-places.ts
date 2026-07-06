// docs/ARCHITECTURE.md「検索・評価型 a. 施設検索」の薄いラッパー。
// Places API (New) の Text Search で候補店舗を探索する。1回のレスポンスで
// name/placeId/address/location/phone/photo をまとめて取得できるため、
// 候補ごとの Place Details 呼び出しは行わない。
export const GOOGLE_PLACES_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.photos",
].join(",");

const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const DEFAULT_PHOTO_MAX_HEIGHT_PX = 640;
const DEFAULT_SEARCH_RADIUS_METERS = 3000;
// Places API (New) Text Search の pageSize 上限（1〜20）。
const MAX_SEARCH_PAGE_SIZE = 20;

type FetchFn = typeof fetch;

export type GooglePlacesRequestOptions = {
  apiKey?: string;
  fetchFn?: FetchFn;
};

export type PlaceSearchCandidate = {
  placeId: string;
  name: string;
  address: string | null;
  location: { lat: number; lng: number } | null;
  phone: string | null;
  photoName: string | null;
};

export type PlaceSearchInput = {
  textQuery: string;
  latLng: { latitude: number; longitude: number };
  radiusMeters?: number;
  pageSize?: number;
};

type PlaceSearchResponse = {
  places?: unknown[];
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

function extractDisplayNameText(displayName: unknown): string | null {
  if (typeof displayName !== "object" || displayName === null) return null;
  return firstNonEmptyString((displayName as Record<string, unknown>).text);
}

export function toPlaceSearchCandidate(place: unknown): PlaceSearchCandidate | null {
  if (typeof place !== "object" || place === null) return null;
  const p = place as Record<string, unknown>;

  const name = extractDisplayNameText(p.displayName);
  if (typeof p.id !== "string" || p.id.length === 0 || !name) return null;

  const location = p.location as Record<string, unknown> | undefined;
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const resolvedLocation =
    isFiniteNumber(latitude) && isFiniteNumber(longitude)
      ? { lat: latitude, lng: longitude }
      : null;

  return {
    placeId: normalizePlaceResourceName(p.id),
    name,
    address: firstNonEmptyString(p.formattedAddress),
    location: resolvedLocation,
    phone: firstNonEmptyString(p.nationalPhoneNumber),
    photoName: extractFirstPhotoName(p.photos),
  };
}

// 自前で店舗一覧を捏造しないよう、Places API のレスポンスに現れた店舗だけを候補にする。
// 該当が少ない場合はそのまま件数の少ない結果を返す（水増しはしない）。
export async function searchPlacesByText(
  input: PlaceSearchInput,
  options: GooglePlacesRequestOptions = {},
): Promise<PlaceSearchCandidate[]> {
  const apiKey = options.apiKey ?? readServerApiKey();
  if (!apiKey) return [];

  const fetchFn = options.fetchFn ?? fetch;
  const url = `${PLACES_API_BASE_URL}/places:searchText`;

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_SEARCH_FIELD_MASK,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        textQuery: input.textQuery,
        languageCode: "ja",
        regionCode: "JP",
        includedType: "restaurant",
        pageSize: Math.max(1, Math.min(input.pageSize ?? MAX_SEARCH_PAGE_SIZE, MAX_SEARCH_PAGE_SIZE)),
        locationBias: {
          circle: {
            center: {
              latitude: input.latLng.latitude,
              longitude: input.latLng.longitude,
            },
            radius: input.radiusMeters ?? DEFAULT_SEARCH_RADIUS_METERS,
          },
        },
      }),
    });

    if (!response.ok) return [];

    const json = (await response.json()) as PlaceSearchResponse;
    if (!Array.isArray(json.places)) return [];
    return json.places
      .map((place) => toPlaceSearchCandidate(place))
      .filter((candidate): candidate is PlaceSearchCandidate => candidate !== null);
  } catch {
    return [];
  }
}

// Places Photo media は API キーでの認証が必須で、ブラウザに直接そのURLを
// 渡すとサーバー専用キーが漏洩する。そのためクライアントには自前の
// プロキシ route（/api/photos/*）のパスだけを渡し、実際の画像取得は
// fetchPlacePhotoMedia がサーバー側で行う。
const PHOTO_NAME_PATTERN = /^places\/[^/]+\/photos\/[^/]+$/;

export function buildStorePhotoProxyPath(photoName: string): string {
  return `/api/photos/${photoName}`;
}

export async function fetchPlacePhotoMedia(
  photoName: string,
  options: GooglePlacesRequestOptions = {},
  maxHeightPx = DEFAULT_PHOTO_MAX_HEIGHT_PX,
): Promise<Response | null> {
  const apiKey = options.apiKey ?? readServerApiKey();
  if (!apiKey || !PHOTO_NAME_PATTERN.test(photoName)) return null;

  const fetchFn = options.fetchFn ?? fetch;
  const url = new URL(`${PLACES_API_BASE_URL}/${photoName}/media`);
  url.searchParams.set("maxHeightPx", String(maxHeightPx));

  try {
    const response = await fetchFn(url.toString(), {
      headers: { "X-Goog-Api-Key": apiKey },
    });
    return response.ok ? response : null;
  } catch {
    return null;
  }
}
