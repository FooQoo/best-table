import { Fragment } from "react";
import { ScoreBadge } from "~/components/ui/score-badge";
import { StorePhoto } from "~/components/ui/store-photo";
import type { Restaurant } from "~/domain/models/restaurant";
import { GOLD, NAVY } from "~/mocks/data";
import { getTheme } from "~/styles/theme";
import { GENRE_LABELS } from "~/utils/evidence-labels";
import { buildGoogleMapsUrl } from "~/utils/google-maps-url";
import { getEmphasisKeys } from "~/utils/scoring";

type ComparePanelProps = {
  stores: Restaurant[];
  counterpartId: string | null;
};

const ROWS: { label: string; key: keyof Restaurant; shaded?: boolean }[] = [
  { label: "接待安全度", key: "score", shaded: true },
  { label: "個室", key: "room" },
  { label: "静かさ", key: "quiet", shaded: true },
  { label: "格式", key: "prestige" },
  { label: "接客", key: "service", shaded: true },
  { label: "アクセス", key: "access" },
  { label: "予算目安", key: "budgetLabel", shaded: true },
  { label: "懸念点", key: "concerns" },
];

export function ComparePanel({ stores, counterpartId }: ComparePanelProps) {
  const t = getTheme();
  const emphasisKeys = getEmphasisKeys(counterpartId);

  return (
    <div
      aria-label="比較"
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#fffdf8]"
    >
      <div className="flex-none border-b border-[#e4ded0] px-5 py-4">
        <h2 className="m-0 font-serif text-lg font-bold text-[#20201c]">
          {stores.length}件を比較中
        </h2>
      </div>

      <div className="flex-1 overflow-auto p-5">
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
              <StorePhoto store={store} className="w-full h-20" />
              <div className="font-bold text-sm">{store.name}</div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#79726a]">
                <span>
                  {store.genre ? GENRE_LABELS[store.genre] : "ジャンル情報なし"}
                </span>
                <a
                  href={buildGoogleMapsUrl(store)}
                  target="_blank"
                  rel="noopener"
                  className="flex-none text-[#8a6a1f] underline underline-offset-2"
                >
                  Google Mapで開く
                </a>
              </div>
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
                      ...(row.key === "concerns"
                        ? {
                            color:
                              store.concerns.length === 0
                                ? "#79726a"
                                : "#9a6a2a",
                          }
                        : undefined),
                      ...(emphasized ? { background: t.accentSoftBg } : undefined),
                    }}
                  >
                    {row.key === "score" ? (
                      <ScoreBadge score={store.score} showLabel={false} />
                    ) : row.key === "concerns" ? (
                      store.concerns.length > 0
                        ? store.concerns.map((c) => c.text).join(" / ")
                        : "特になし"
                    ) : (
                      (store[row.key] ?? "情報なし").toString()
                    )}
                  </div>
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
