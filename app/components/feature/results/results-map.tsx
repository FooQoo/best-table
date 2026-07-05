import type { Restaurant } from "~/domain/models/restaurant";
import { GOLD } from "~/mocks/data";

type MappableStore = Restaurant & { pos?: { top: string; left: string } };

type ResultsMapProps = {
  stores: MappableStore[];
};

export function ResultsMap({ stores }: ResultsMapProps) {
  const locatedStores = stores.filter(
    (store): store is MappableStore & { location: { lat: number; lng: number } } =>
      Boolean(store.location),
  );
  const markerStores =
    locatedStores.length > 0
      ? locatedStores.map((store) => ({
          store,
          position: projectLocation(store.location, locatedStores),
        }))
      : stores
          .filter((store): store is MappableStore & { pos: { top: string; left: string } } =>
            Boolean(store.pos),
          )
          .map((store) => ({ store, position: store.pos }));
  const label =
    locatedStores.length > 0
      ? "地図エリア（座標付きモック）"
      : "地図エリア（プレースホルダー）";

  return (
    <div
      className="flex-1 relative overflow-hidden bg-[#e9e4d6]"
      style={{
        backgroundImage:
          "linear-gradient(0deg,rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      <div className="absolute top-4 left-4 text-[11px] font-mono text-[#8a8474]">
        {label}
      </div>
      {markerStores
        .map(({ store, position }) => (
          <div
            key={store.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 font-bold text-xs px-2.5 py-1 rounded-full border-[1.5px] border-white shadow-[0_1px_4px_rgba(0,0,0,.2)] text-[#20201c]"
            style={{
              top: position.top,
              left: position.left,
              background: (store.score ?? 0) >= 85 ? GOLD : "#eee6d0",
            }}
          >
            {store.score ?? "―"}
          </div>
      ))}
    </div>
  );
}

function projectLocation(
  location: { lat: number; lng: number },
  stores: Array<{ location: { lat: number; lng: number } }>,
): { top: string; left: string } {
  const lats = stores.map((store) => store.location.lat);
  const lngs = stores.map((store) => store.location.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 0.01;
  const lngSpan = maxLng - minLng || 0.01;
  const x = 18 + ((location.lng - minLng) / lngSpan) * 64;
  const y = 18 + ((maxLat - location.lat) / latSpan) * 64;

  return {
    top: `${Math.round(y)}%`,
    left: `${Math.round(x)}%`,
  };
}
