import { AREA_REGIONS } from "~/mocks/data";

// docs/ARCHITECTURE.md「検索・評価型」: Gemini の Google マップによるグラウンディングには
// 緯度経度でしか位置を渡せないため、ヒアリングのエリア選択（固定選択肢）を静的な対応表で変換する。
// エリアが自由入力・動的になった場合のみ Geocoding API 等の追加変換を検討する（現状は不要）。
export type LatLng = { latitude: number; longitude: number };

export const AREA_COORDINATES: Record<string, LatLng> = {
  銀座: { latitude: 35.6717, longitude: 139.7639 },
  六本木: { latitude: 35.6627, longitude: 139.7314 },
  "赤坂・虎ノ門": { latitude: 35.6693, longitude: 139.7431 },
  "丸の内・大手町": { latitude: 35.6845, longitude: 139.7638 },
  新橋: { latitude: 35.6659, longitude: 139.7583 },
  横浜: { latitude: 35.4658, longitude: 139.6222 },
  川崎: { latitude: 35.5309, longitude: 139.7028 },
  仙台: { latitude: 38.2682, longitude: 140.8694 },
  新潟市: { latitude: 37.9161, longitude: 139.0364 },
  松本: { latitude: 36.2381, longitude: 137.9721 },
  金沢: { latitude: 36.5613, longitude: 136.6562 },
  名古屋: { latitude: 35.1815, longitude: 136.9066 },
  静岡市: { latitude: 34.9769, longitude: 138.3831 },
  梅田: { latitude: 34.7024, longitude: 135.4959 },
  難波: { latitude: 34.6657, longitude: 135.5008 },
  京都市: { latitude: 35.0116, longitude: 135.7681 },
  神戸: { latitude: 34.6901, longitude: 135.1955 },
};

// AREA_REGIONS に定義された全都市が座標表に存在することを起動時にも検証できるよう、
// この一覧生成ロジック自体をテストで検証する（app/constants/area-coordinates.test.ts）。
export const ALL_AREA_CITIES: readonly string[] = AREA_REGIONS.flatMap((region) =>
  region.prefectures.flatMap((prefecture) => prefecture.cities),
);

// 選択済みエリアの先頭から解決できる緯度経度を返す。どれも対応表にない場合は null にし、
// 架空の座標で埋め合わせない（docs/RELIABILITY.md）。
export function resolveAreaLatLng(selectedAreas: string[]): LatLng | null {
  for (const area of selectedAreas) {
    const coords = AREA_COORDINATES[area];
    if (coords) return coords;
  }
  return null;
}
