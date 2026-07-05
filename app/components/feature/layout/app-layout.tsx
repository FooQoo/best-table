import { Outlet, useNavigate } from "react-router";
import { useBooking } from "~/state/booking-context";
import { GOLD, HISTORY } from "~/mocks/data";

export function AppLayout() {
  const navigate = useNavigate();
  const { resetForNewChat } = useBooking();

  const goTop = () => {
    resetForNewChat();
    navigate("/");
  };

  return (
    <div className="h-screen bg-[#f7f4ee] flex flex-col overflow-hidden">
      <div className="h-16 flex-none bg-[#12202f] flex items-center justify-between px-8 shadow-[0_1px_0_rgba(200,162,74,.35)]">
        <button
          type="button"
          onClick={goTop}
          className="flex items-baseline gap-3.5 bg-transparent border-none cursor-pointer px-0.5 py-1.5 rounded hover:opacity-85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
        >
          <span className="font-serif font-bold text-[22px] text-[#c8a24a] tracking-wide">
            Best Table
          </span>
          <span className="text-xs text-[#9aa5ad]">
            接待・会食のための、お店選びAI
          </span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-[236px] flex-none bg-[#0d1822] border-r border-white/8 flex flex-col px-3.5 py-5 gap-1.5 overflow-y-auto">
          <button
            type="button"
            onClick={goTop}
            className="flex items-center justify-start gap-2 px-3.5 py-2.5 border-[1.5px] rounded-md bg-transparent font-semibold text-[13px] cursor-pointer mb-3.5 transition-colors"
            style={{ borderColor: GOLD, color: GOLD }}
          >
            ＋ 新しい相談を始める
          </button>
          <div className="text-[11px] text-[#7a8894] tracking-wide px-1 mb-0.5">
            履歴
          </div>
          {HISTORY.map((h) => (
            <div
              key={h.title}
              className="px-3 py-2.5 rounded-md cursor-pointer transition-colors hover:bg-white/6"
            >
              <div className="text-[13px] text-[#dfe3e6]">{h.title}</div>
              <div className="text-[11px] text-[#7a8894] mt-0.5">{h.date}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
