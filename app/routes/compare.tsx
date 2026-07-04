import { Fragment } from "react";
import { useNavigate } from "react-router";
import { useBooking } from "~/lib/booking-context";
import { GOLD, NAVY, STORES } from "~/lib/data";
import { getTheme, toggleButtonStyle } from "~/lib/theme";

export default function CompareScreen() {
  const navigate = useNavigate();
  const { state, selectFinalStore } = useBooking();
  const t = getTheme();

  const selectedStores = STORES.filter((s) => state.compareIds.includes(s.id)).sort((a, b) => b.score - a.score);
  const selectedCount = selectedStores.length;
  const finalStore = selectedStores.find((s) => s.id === state.finalStoreId) ?? null;

  if (selectedCount === 0) {
    return (
      <div className="flex-1 p-10 flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-[#79726a]">比較する店舗が選択されていません。</div>
        <button
          type="button"
          onClick={() => navigate("/results")}
          className="text-sm text-[#8a6a1a] underline cursor-pointer bg-transparent border-none"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  const rows: { label: string; key: keyof (typeof STORES)[number]; shaded?: boolean }[] = [
    { label: "接待安全度", key: "score", shaded: true },
    { label: "個室", key: "room" },
    { label: "静かさ", key: "quiet", shaded: true },
    { label: "格式", key: "prestige" },
    { label: "接客", key: "service", shaded: true },
    { label: "アクセス", key: "access" },
    { label: "懸念点", key: "concern", shaded: true },
  ];

  return (
    <div className="flex-1 p-10 flex justify-center">
      <div className="w-full max-w-[1040px]">
        <div className="flex justify-between items-baseline mb-6">
          <h1 className="font-serif font-bold text-2xl m-0">{selectedCount}件を比較中</h1>
          <button
            type="button"
            onClick={() => navigate("/results")}
            className="text-[13px] text-[#8a6a1a] bg-transparent border-none cursor-pointer underline p-1 rounded hover:text-[#5c4610] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
          >
            一覧に戻る
          </button>
        </div>

        <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] overflow-hidden">
          <div
            className="grid"
            style={{ gridTemplateColumns: `160px repeat(${selectedCount}, 1fr)` }}
          >
            <div className="p-4" style={{ borderBottom: `2px solid ${NAVY}` }} />
            {selectedStores.map((store, i) => (
              <div
                key={store.id}
                className="p-4 border-l border-[#e4ded0] flex flex-col gap-2"
                style={{ borderBottom: `2px solid ${NAVY}`, background: i === 0 ? t.accentSoftBg : "#fff" }}
              >
                <div
                  className="self-start font-bold text-[11px] px-2.5 py-0.5 rounded-full"
                  style={i === 0 ? { background: GOLD, color: "#20201c" } : { visibility: "hidden" }}
                >
                  おすすめ 1位
                </div>
                <div
                  className="w-full h-20 border border-dashed border-[#b3ab98] flex items-center justify-center text-[11px] font-mono text-[#6b6552]"
                  style={{
                    background: "repeating-linear-gradient(45deg,#e4e0d5,#e4e0d5 6px,#d8d3c4 6px,#d8d3c4 12px)",
                  }}
                >
                  {store.photo}
                </div>
                <div className="font-bold text-sm">{store.name}</div>
                <div className="text-[11px] text-[#79726a]">{store.genre}</div>
              </div>
            ))}

            {rows.map((row) => (
              <Fragment key={row.label}>
                <div
                  className={`p-3.5 font-bold text-[13px] border-b border-[#eee] ${row.shaded ? "bg-[#faf8f3]" : ""}`}
                >
                  {row.label}
                </div>
                {selectedStores.map((store) => (
                  <div
                    key={`${row.label}-${store.id}`}
                    className="p-3.5 text-center border-b border-[#eee] border-l border-[#e4ded0] text-[13px]"
                    style={row.key === "concern" ? { color: store.concern === "特になし" ? "#79726a" : "#9a6a2a" } : undefined}
                  >
                    {row.key === "score" ? (
                      <span
                        className="font-bold text-xs px-2.5 py-0.5 rounded-full"
                        style={{ background: store.score >= 85 ? t.accent : "#eee6d0", color: "#20201c" }}
                      >
                        {store.score}
                      </span>
                    ) : (
                      String(store[row.key])
                    )}
                  </div>
                ))}
              </Fragment>
            ))}

            <div className="p-4" />
            {selectedStores.map((store) => {
              const selected = state.finalStoreId === store.id;
              const s = toggleButtonStyle(t, selected, false);
              return (
                <div key={store.id} className="p-4 border-l border-[#e4ded0] flex justify-center">
                  <button
                    type="button"
                    onClick={() => selectFinalStore(store.id)}
                    className="w-full px-3 py-2.5 border-[1.5px] rounded-md cursor-pointer font-bold text-[13px] transition-colors"
                    style={{ borderColor: s.btnBorder, background: s.btnBg, color: s.btnColor }}
                  >
                    {selected ? "選択中 ✓" : "この店に決める"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {finalStore && (
          <div className="mt-7 bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] px-8 py-7">
            <div className="font-serif font-bold text-lg mb-1">{finalStore.name}</div>
            <div className="text-[13px] text-[#79726a] mb-5">
              {finalStore.genre}・{finalStore.area}・個室：{finalStore.room}
            </div>

            <div className="flex gap-7 flex-wrap">
              <div className="flex-1 min-w-[220px] flex flex-col gap-3.5">
                <div>
                  <div className="font-bold text-xs text-[#79726a] mb-1">連絡先</div>
                  <div className="text-[15px]">{finalStore.phone}</div>
                </div>
                <div>
                  <div className="font-bold text-xs text-[#79726a] mb-1">アクセス</div>
                  <div className="text-[15px]">{finalStore.access}</div>
                </div>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener"
                  className="mt-2 self-start px-6 py-3 rounded-md font-bold text-sm no-underline transition-colors"
                  style={{ background: NAVY, color: GOLD }}
                >
                  一休で予約する
                </a>
              </div>
              <div
                className="flex-1 min-w-[220px] h-[180px] relative overflow-hidden rounded-md bg-[#e9e4d6]"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg,rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              >
                <div className="absolute top-3 left-3 text-[11px] font-mono text-[#8a8474]">
                  地図（プレースホルダー）
                </div>
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,.3)]"
                  style={{ background: GOLD }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
