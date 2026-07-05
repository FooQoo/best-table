import type { LoaderFunctionArgs } from "react-router";
import { getPhotoRepository } from "~/server/repositories/photo-repository";

// docs/ARCHITECTURE.md「店舗写真の取得」の resource route。
// Restaurant.photoUrl はこのプロキシ経路のパスであり、Google の Places Photo
// media URL を直接クライアントへ渡さない（サーバー専用 API キーの漏洩を防ぐ）。
// mock/real の切り替えは意識せず、repository（getPhotoRepository）に委譲する。
export async function loader({ params }: LoaderFunctionArgs) {
  const photoName = params["*"];
  if (!photoName) {
    return new Response("not found", { status: 404 });
  }

  const repository = getPhotoRepository();
  const response = await repository.getPhotoMedia(photoName);
  return response ?? new Response("not found", { status: 404 });
}
