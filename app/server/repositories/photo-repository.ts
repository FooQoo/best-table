import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchPlacePhotoMedia } from "~/server/clients/google-places";

// docs/ARCHITECTURE.md「店舗写真の取得」: `/api/photos/*` の resource route は
// MODE を意識せず、この repository を呼ぶだけにする。
// mock/real の切り替えは getPhotoRepository に閉じ込める。
export type PhotoRepository = {
  getPhotoMedia(photoName: string): Promise<Response | null>;
};

function toImageResponse(media: Response): Response {
  return new Response(media.body, {
    status: 200,
    headers: {
      "Content-Type": media.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export const realPhotoRepository: PhotoRepository = {
  async getPhotoMedia(photoName) {
    const media = await fetchPlacePhotoMedia(photoName);
    return media ? toImageResponse(media) : null;
  },
};

// placeId（"places/ChIJ..."）と代表写真 URL の対応表。実際に生成したことのない
// placeId には Google の実写真が存在しないため、mock mode では実際に検索した
// `app/mocks/fixtures/restaurants-search.json` の placeId に対して、この
// マッピングをあわせて記録する（同じ理由で .gitignore 対象）。
export type PhotoMapping = Record<string, string>;

export const PHOTO_MAPPING_FIXTURE_PATH = join(
  process.cwd(),
  "app/mocks/fixtures/photo-mapping.json",
);

export type ReadFixtureFile = (path: string) => string;

const defaultReadFile: ReadFixtureFile = (path) => readFileSync(path, "utf-8");

// photoName は "places/{placeId}/photos/{photoRef}" の形式。マッピングのキーは
// Restaurant.placeId と同じ "places/{placeId}" 部分だけを使う。
export function extractPlaceIdFromPhotoName(photoName: string): string | null {
  const separatorIndex = photoName.indexOf("/photos/");
  if (separatorIndex === -1) return null;
  const placeId = photoName.slice(0, separatorIndex);
  return placeId.startsWith("places/") ? placeId : null;
}

export function loadMockPhotoMapping(
  readFile: ReadFixtureFile = defaultReadFile,
): PhotoMapping {
  let raw: string;
  try {
    raw = readFile(PHOTO_MAPPING_FIXTURE_PATH);
  } catch {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const mapping: PhotoMapping = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string") mapping[key] = value;
  }
  return mapping;
}

type MockPhotoRepositoryOptions = {
  loadMapping?: () => PhotoMapping;
};

export function createMockPhotoRepository(
  options: MockPhotoRepositoryOptions = {},
): PhotoRepository {
  const loadMapping = options.loadMapping ?? loadMockPhotoMapping;

  return {
    async getPhotoMedia(photoName) {
      const placeId = extractPlaceIdFromPhotoName(photoName);
      if (!placeId) return null;

      const url = loadMapping()[placeId];
      if (!url) return null;

      // 画像バイト自体はプロキシせず、記録済みの代表写真 URL へリダイレクトするだけ。
      // Google へは一切問い合わせない。
      return Response.redirect(url, 302);
    },
  };
}

export const mockPhotoRepository: PhotoRepository = createMockPhotoRepository();

export function getPhotoRepository(): PhotoRepository {
  return process.env.MODE === "mock" ? mockPhotoRepository : realPhotoRepository;
}
