import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { AREA_REGIONS, GOLD, type Prefecture } from "~/mocks/data";
import { useBookingQuery } from "~/state/booking-query-state";

export function AreaPicker() {
  const query = useBookingQuery();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<0 | 1>(0);
  const [activePrefecture, setActivePrefecture] = useState<Prefecture | null>(
    null,
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setLevel(0);
      setActivePrefecture(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="box-border flex min-h-6 w-full min-w-[260px] flex-[2] flex-wrap items-center gap-2 rounded-md border-[1.5px] border-[#d8d2c0] bg-white px-3 py-2 text-[15px] text-[#20201c] cursor-pointer focus-visible:border-[#c8a24a] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)] sm:w-auto"
        >
          <span style={{ color: GOLD }}>📍</span>
          {query.selectedAreas.length > 0 ? (
            query.selectedAreas.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdf6e3] border border-[#e6d3a0] text-[13px]"
              >
                {city}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    query.removeArea(city);
                  }}
                  className="text-[#8a6a1a] cursor-pointer"
                >
                  ×
                </span>
              </span>
            ))
          ) : (
            <span className="text-[#a39d8c] text-sm">エリアを選択</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex h-[min(420px,calc(100dvh-96px))] w-[min(calc(100vw-32px),460px)] flex-col gap-0 overflow-hidden p-0"
      >
        <div className="flex-1 overflow-hidden relative">
          <div
            className="flex w-[200%] h-full transition-transform duration-300 ease-out"
            style={{
              transform: level === 1 ? "translateX(-50%)" : "translateX(0%)",
            }}
          >
            <div className="w-1/2 flex-none overflow-y-auto px-6 py-5">
              <div className="font-bold text-[13px] text-[#79726a] mb-3.5">
                都道府県選択
              </div>
              {AREA_REGIONS.map((r) => (
                <div key={r.region} className="mb-4">
                  <div className="font-bold text-[13px] mb-2">{r.region}</div>
                  <div className="flex flex-col gap-1">
                    {r.prefectures.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setActivePrefecture(p);
                          setLevel(1);
                        }}
                        className="flex items-center justify-between bg-transparent border-none px-1.5 py-2 cursor-pointer text-sm text-[#20201c] rounded hover:bg-[#fdf9ef] text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
                      >
                        {p.name}
                        <span className="text-[#a39d8c]">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="w-1/2 flex-none overflow-y-auto px-6 py-5">
              <div className="text-[13px] text-[#79726a] mb-3.5">
                <span
                  onClick={() => setLevel(0)}
                  className="text-[#2a5a8a] underline cursor-pointer"
                >
                  都道府県選択
                </span>{" "}
                › {activePrefecture?.name ?? ""}
              </div>
              <div className="flex flex-col">
                {activePrefecture?.cities.map((city) => {
                  const checked = query.selectedAreas.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => query.toggleCity(city)}
                      className="flex items-center gap-3 px-1.5 py-3.5 border-none border-b border-[#f0ece0] bg-transparent cursor-pointer text-[15px] text-[#20201c] text-left hover:bg-[#fdf9ef] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
                    >
                      <span
                        className="w-[18px] h-[18px] flex-none rounded border-[1.5px] flex items-center justify-center text-[11px] text-[#f7f4ee]"
                        style={{
                          borderColor: checked ? "#12202f" : "#b8b09a",
                          background: checked ? "#12202f" : "transparent",
                        }}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-none px-5 py-3.5 border-t border-[#eee6d6] flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-6 py-2.5 border-none rounded-md font-bold text-sm text-[#20201c] cursor-pointer transition-colors"
            style={{ background: GOLD }}
          >
            決定する
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
