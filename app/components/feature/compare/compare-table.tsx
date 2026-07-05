import { Fragment } from "react";
import { ScoreBadge } from "~/components/ui/score-badge";
import { StorePhotoPlaceholder } from "~/components/ui/store-photo-placeholder";
import { GOLD, NAVY, type Store } from "~/mocks/data";
import { getTheme, toggleButtonStyle } from "~/styles/theme";
import { getEmphasisKeys } from "~/utils/scoring";

type CompareTableProps = {
  stores: Store[];
  finalStoreId: string | null;
  onSelectFinalStore: (id: string) => void;
  counterpartId: string | null;
};

const ROWS: { label: string; key: keyof Store; shaded?: boolean }[] = [
  { label: "接待安全度", key: "score", shaded: true },
  { label: "個室", key: "room" },
  { label: "静かさ", key: "quiet", shaded: true },
  { label: "格式", key: "prestige" },
  { label: "接客", key: "service", shaded: true },
  { label: "アクセス", key: "access" },
  { label: "懸念点", key: "concern", shaded: true },
];

export function CompareTable({
  stores,
  finalStoreId,
  onSelectFinalStore,
  counterpartId,
}: CompareTableProps) {
  const t = getTheme();
  const emphasisKeys = getEmphasisKeys(counterpartId);

  return (
    <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] overflow-x-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `160px repeat(${stores.length}, minmax(150px, 1fr))`,
        }}
      >
        <div className="p-4" style={{ borderBottom: `2px solid ${NAVY}` }} />
        {stores.map((store, i) => (
          <div
            key={store.id}
            className="p-4 border-l border-[#e4ded0] flex flex-col gap-2"
            style={{
              borderBottom: `2px solid ${NAVY}`,
              background: i === 0 ? t.accentSoftBg : "#fff",
            }}
          >
            <div
              className="self-start font-bold text-[11px] px-2.5 py-0.5 rounded-full"
              style={
                i === 0
                  ? { background: GOLD, color: "#20201c" }
                  : { visibility: "hidden" }
              }
            >
              おすすめ 1位
            </div>
            <StorePhotoPlaceholder
              label={store.photo}
              className="w-full h-20"
            />
            <div className="font-bold text-sm">{store.name}</div>
            <div className="text-[11px] text-[#79726a]">{store.genre}</div>
          </div>
        ))}

        {ROWS.map((row) => {
          const emphasized = (emphasisKeys as string[]).includes(row.key);
          return (
            <Fragment key={row.label}>
              <div
                data-emphasized={emphasized}
                className={`p-3.5 font-bold text-[13px] border-b border-[#eee] ${row.shaded ? "bg-[#faf8f3]" : ""}`}
                style={emphasized ? { color: "#8a6a1a" } : undefined}
              >
                {row.label}
                {emphasized && (
                  <span
                    className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: GOLD, color: "#20201c" }}
                  >
                    重視
                  </span>
                )}
              </div>
              {stores.map((store) => (
                <div
                  key={`${row.label}-${store.id}`}
                  className="p-3.5 text-center border-b border-[#eee] border-l border-[#e4ded0] text-[13px]"
                  style={{
                    ...(row.key === "concern"
                      ? {
                          color:
                            store.concern === "特になし"
                              ? "#79726a"
                              : "#9a6a2a",
                        }
                      : undefined),
                    ...(emphasized ? { background: t.accentSoftBg } : undefined),
                  }}
                >
                  {row.key === "score" ? (
                    <ScoreBadge score={store.score} showLabel={false} />
                  ) : (
                    String(store[row.key])
                  )}
                </div>
              ))}
            </Fragment>
          );
        })}

        <div className="p-4" />
        {stores.map((store) => {
          const selected = finalStoreId === store.id;
          const s = toggleButtonStyle(t, selected, false);
          return (
            <div
              key={store.id}
              className="p-4 border-l border-[#e4ded0] flex justify-center"
            >
              <button
                type="button"
                onClick={() => onSelectFinalStore(store.id)}
                className="w-full px-3 py-2.5 border-[1.5px] rounded-md cursor-pointer font-bold text-[13px] transition-colors"
                style={{
                  borderColor: s.btnBorder,
                  background: s.btnBg,
                  color: s.btnColor,
                }}
              >
                {selected ? "選択中 ✓" : "この店に決める"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
