import type { Restaurant } from "~/domain/models/restaurant";
import { GOLD } from "~/mocks/data";

// pos はプロトタイプ用のプレースホルダー配置（`Store`）専用。実検索結果（`Restaurant`）は
// 実緯度経度を持たないため、架空の位置を作らずマーカーを表示しない
// （docs/ARCHITECTURE.md「地図表示の実装」）。
type MappableStore = Restaurant & { pos?: { top: string; left: string } };

type ResultsMapProps = {
  stores: MappableStore[];
};

export function ResultsMap({ stores }: ResultsMapProps) {
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
        地図エリア（プレースホルダー）
      </div>
      {stores
        .filter((store): store is MappableStore & { pos: { top: string; left: string } } =>
          Boolean(store.pos),
        )
        .map((store) => (
          <div
            key={store.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 font-bold text-xs px-2.5 py-1 rounded-full border-[1.5px] border-white shadow-[0_1px_4px_rgba(0,0,0,.2)] text-[#20201c]"
            style={{
              top: store.pos.top,
              left: store.pos.left,
              background: (store.score ?? 0) >= 85 ? GOLD : "#eee6d0",
            }}
          >
            {store.score ?? "―"}
          </div>
        ))}
    </div>
  );
}
