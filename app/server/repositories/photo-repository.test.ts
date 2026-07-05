import { describe, expect, it } from "vitest";
import {
  createMockPhotoRepository,
  extractPlaceIdFromPhotoName,
  loadMockPhotoMapping,
} from "./photo-repository";

describe("extractPlaceIdFromPhotoName", () => {
  it("photos の手前までを placeId として取り出す", () => {
    expect(extractPlaceIdFromPhotoName("places/ChIJabc/photos/photo-1")).toBe(
      "places/ChIJabc",
    );
  });

  it("places/ で始まらない場合は null を返す", () => {
    expect(extractPlaceIdFromPhotoName("not-a-place/photos/photo-1")).toBeNull();
  });

  it("/photos/ を含まない場合は null を返す", () => {
    expect(extractPlaceIdFromPhotoName("places/ChIJabc")).toBeNull();
  });
});

describe("loadMockPhotoMapping", () => {
  it("ファイル読み込みで取得した JSON を placeId→URL のマッピングとして返す", () => {
    const mapping = loadMockPhotoMapping(() =>
      JSON.stringify({ "places/abc": "https://example.com/a.jpg" }),
    );
    expect(mapping).toEqual({ "places/abc": "https://example.com/a.jpg" });
  });

  it("ファイルが存在しない場合（gitignore 対象で未生成の環境）は空オブジェクトにフォールバックする", () => {
    const mapping = loadMockPhotoMapping(() => {
      throw new Error("ENOENT: no such file");
    });
    expect(mapping).toEqual({});
  });

  it("JSON が壊れている場合は空オブジェクトにフォールバックする", () => {
    expect(loadMockPhotoMapping(() => "not valid json")).toEqual({});
  });

  it("オブジェクトでない JSON は空オブジェクトにフォールバックする", () => {
    expect(loadMockPhotoMapping(() => JSON.stringify(["a", "b"]))).toEqual({});
  });

  it("値が文字列でないエントリは取り除く", () => {
    const mapping = loadMockPhotoMapping(() =>
      JSON.stringify({ "places/abc": "https://example.com/a.jpg", "places/def": 123 }),
    );
    expect(mapping).toEqual({ "places/abc": "https://example.com/a.jpg" });
  });
});

describe("createMockPhotoRepository", () => {
  it("マッピングに存在する placeId は代表写真 URL への 302 リダイレクトを返す", async () => {
    const repository = createMockPhotoRepository({
      loadMapping: () => ({ "places/abc": "https://example.com/a.jpg" }),
    });

    const response = await repository.getPhotoMedia("places/abc/photos/photo-1");

    expect(response).not.toBeNull();
    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe("https://example.com/a.jpg");
  });

  it("マッピングに存在しない placeId は null を返す", async () => {
    const repository = createMockPhotoRepository({ loadMapping: () => ({}) });

    const response = await repository.getPhotoMedia("places/unknown/photos/photo-1");

    expect(response).toBeNull();
  });

  it("不正な photoName は null を返す", async () => {
    const repository = createMockPhotoRepository({
      loadMapping: () => ({ "places/abc": "https://example.com/a.jpg" }),
    });

    const response = await repository.getPhotoMedia("not-a-valid-photo-name");

    expect(response).toBeNull();
  });
});
