import { Outlet, useNavigate } from "react-router";
import { useBooking } from "~/state/booking-context";
import { GOLD } from "~/mocks/data";

export function AppLayout() {
  const navigate = useNavigate();
  const { resetForNewChat } = useBooking();

  const goTop = () => {
    resetForNewChat();
    navigate("/");
  };

  return (
    <div className="h-screen bg-[#f7f4ee] flex flex-col overflow-hidden">
      <div className="h-16 flex-none bg-[#12202f] flex items-center justify-between gap-3 px-4 shadow-[0_1px_0_rgba(200,162,74,.35)] sm:px-8">
        <button
          type="button"
          onClick={goTop}
          className="flex items-center gap-3 bg-transparent border-none cursor-pointer px-0.5 py-1.5 rounded hover:opacity-85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
        >
          <img src="/logo.png" alt="Best Table logo" className="h-10 w-auto shrink-0 sm:h-12" />
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-serif font-bold text-[20px] text-[#c8a24a] tracking-wide leading-none sm:text-[22px]">
              Best Table
            </span>
            <span className="hidden text-xs text-[#9aa5ad] sm:inline">
              接待・会食のための、お店選びAI
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={goTop}
          className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border-[1.5px] bg-transparent px-2.5 text-[13px] font-semibold transition-colors hover:bg-white/6 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)] sm:px-3.5"
          style={{ borderColor: GOLD, color: GOLD }}
        >
          <span aria-hidden="true">＋</span>
          <span className="hidden sm:inline">新しい相談を始める</span>
          <span className="sm:hidden">新規</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
