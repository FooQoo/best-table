import type { Genre } from "~/domain/models/restaurant";

// docs/ARCHITECTURE.md「検索・評価型 a. 施設検索」の薄いラッパー。
// Places API (New) の Text Search で候補店舗を探索する。1回のレスポンスで
// name/placeId/address/location/phone/photo/genre をまとめて取得できるため、
// 候補ごとの Place Details 呼び出しは行わない。
// primaryType/types は nationalPhoneNumber と同じ Pro/Enterprise SKU 内なので、
// 既にリクエストしている nationalPhoneNumber（Enterprise SKU）に対して追加課金は発生しない。
// rating/userRatingCount/reviews/reviewSummary は意図的に取得しない。Google Maps
// Platform利用規約上、reviewSummary（口コミ要約）はGoogleが定める帰属表示（"Summarized
// with Gemini"の開示 + reviewsUriへのリンク）を伴う「表示」用途を前提にしており、
// 別のAIモデルへの入力として加工し、帰属表示なしで独自の評価文として表示することへの
// 明示的な許可が見当たらないため撤回した（要否を再検討する場合は法務確認必須）。
export const GOOGLE_PLACES_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.photos",
  "places.primaryType",
  "places.types",
].join(",");

// Google Places の type 語彙を Restaurant.genre の固定語彙へ決定的に変換する。
// 対応関係が無い・未知の type は "other" にし、AI 同様に存在しないジャンルを捏造しない。
// 参照: https://developers.google.com/maps/documentation/places/web-service/place-types
const PLACE_TYPE_TO_GENRE: Record<string, Genre> = {
  japanese_restaurant: "japanese",
  japanese_curry_restaurant: "japanese",
  tonkatsu_restaurant: "japanese",
  sushi_restaurant: "sushi",
  yakiniku_restaurant: "yakiniku",
  yakitori_restaurant: "yakiniku",
  ramen_restaurant: "noodles",
  udon_restaurant: "noodles",
  soba_restaurant: "noodles",
  chinese_restaurant: "chinese",
  chinese_noodle_restaurant: "chinese",
  dim_sum_restaurant: "chinese",
  cantonese_restaurant: "chinese",
  taiwanese_restaurant: "chinese",
  italian_restaurant: "western",
  french_restaurant: "western",
  spanish_restaurant: "western",
  german_restaurant: "western",
  british_restaurant: "western",
  american_restaurant: "western",
  steak_house: "western",
  bar: "bar",
  pub: "bar",
  bar_and_grill: "bar",
  japanese_izakaya_restaurant: "bar",
  cocktail_bar: "bar",
  sports_bar: "bar",
  wine_bar: "bar",
  hookah_bar: "bar",
  beer_garden: "bar",
  lounge_bar: "bar",
  coffee_shop: "cafe",
  cafe: "cafe",
  tea_house: "cafe",
  bakery: "bakery",
  donut_shop: "bakery",
  pastry_shop: "bakery",
};

export function mapPlaceTypesToGenre(
  primaryType: string | null,
  types: string[],
): Genre | null {
  if (primaryType && PLACE_TYPE_TO_GENRE[primaryType]) {
    return PLACE_TYPE_TO_GENRE[primaryType];
  }
  for (const type of types) {
    const genre = PLACE_TYPE_TO_GENRE[type];
    if (genre) return genre;
  }
  if (primaryType || types.length > 0) return "other";
  return null;
}

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
  genre: Genre | null;
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

  const types = Array.isArray(p.types)
    ? p.types.filter((type): type is string => typeof type === "string")
    : [];
  const primaryType = typeof p.primaryType === "string" ? p.primaryType : null;

  return {
    placeId: normalizePlaceResourceName(p.id),
    name,
    address: firstNonEmptyString(p.formattedAddress),
    location: resolvedLocation,
    phone: firstNonEmptyString(p.nationalPhoneNumber),
    photoName: extractFirstPhotoName(p.photos),
    genre: mapPlaceTypesToGenre(primaryType, types),
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
