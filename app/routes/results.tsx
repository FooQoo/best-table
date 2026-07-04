import { useNavigate } from "react-router";
import { useBooking } from "~/lib/booking-context";
import { PRIORITIES, STORES } from "~/lib/data";
import { getTheme, toggleButtonStyle } from "~/lib/theme";

export default function ResultsScreen() {
  const navigate = useNavigate();
  const { state, toggleCompare, resetForNewChat } = useBooking();
  const t = getTheme();

  const priorityLabelByKey = Object.fromEntries(PRIORITIES.map((p) => [p.key, p.label]));
  const recapKeyword = state.selectedAreas.length ? state.selectedAreas.join("・") : "エリア未指定";
  const recapDateTime = `${state.date} ${state.time}`;
  const recapBudget =
    state.budgetMin !== "指定なし" || state.budgetMax !== "指定なし"
      ? `${state.budgetMin} 〜 ${state.budgetMax}`
      : state.budgetOtherOn && state.budgetOtherText.trim()
        ? state.budgetOtherText
        : "指定なし";
  const recapPriorities = state.priorities.length
    ? state.priorities.map((k) => priorityLabelByKey[k]).join("・")
    : state.counterpart
      ? "指定なし"
      : "未ヒアリング";

  const sortedStores = [...STORES].sort((a, b) => b.score - a.score);
  const compareCount = state.compareIds.length;
  const canCompare = compareCount >= 2;

  const changeConditions = () => {
    resetForNewChat();
    navigate("/");
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden box-border">
      <div className="px-8 py-4 bg-white border-b-[1.5px] border-[#e4ded0] flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="text-sm text-[#20201c]">
            <b>{recapKeyword}</b>・{recapDateTime}・{state.people}名・ご予算：{recapBudget}・重視：{recapPriorities}
          </div>
          <button
            type="button"
            onClick={changeConditions}
            className="text-[13px] text-[#8a6a1a] bg-transparent border-none cursor-pointer underline p-1 rounded hover:text-[#5c4610] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
          >
            条件を変更する
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-[400px] flex-none overflow-y-auto p-6 flex flex-col gap-4 bg-[#f7f4ee]">
          <div className="font-bold text-[15px]">接待安全度の高い順・{sortedStores.length}件</div>
          {sortedStores.map((store) => {
            const selected = state.compareIds.includes(store.id);
            const disabled = !selected && compareCount >= 5;
            const badgeBg = store.score >= 85 ? t.accent : "#eee6d0";
            const concernColor = store.concern === "特になし" ? "#79726a" : "#9a6a2a";
            const s = toggleButtonStyle(t, selected, disabled);

            return (
              <div
                key={store.id}
                className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-4 flex flex-col gap-2.5"
              >
                <div className="flex gap-3">
                  <div
                    className="w-20 h-20 flex-none border border-dashed border-[#b3ab98] flex items-center justify-center text-[11px] font-mono text-[#6b6552] text-center"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg,#e4e0d5,#e4e0d5 6px,#d8d3c4 6px,#d8d3c4 12px)",
                    }}
                  >
                    {store.photo}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-[15px]">{store.name}</div>
                      <div
                        className="font-bold text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap text-[#20201c]"
                        style={{ background: badgeBg }}
                      >
                        安全度 {store.score}
                      </div>
                    </div>
                    <div className="text-xs text-[#79726a] mt-1">
                      {store.genre}・{store.area}
                    </div>
                    <div className="text-xs text-[#79726a] mt-0.5">個室：{store.room}</div>
                  </div>
                </div>
                <div className="text-xs" style={{ color: concernColor }}>
                  ⚠ {store.concern}
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleCompare(store.id)}
                  className="self-end flex items-center gap-2 px-4 py-2 border-[1.5px] rounded-md text-[13px] cursor-pointer transition-colors disabled:cursor-not-allowed"
                  style={{ borderColor: s.btnBorder, background: s.btnBg, color: s.btnColor }}
                >
                  <span
                    className="w-[13px] h-[13px] flex-none rounded-[3px] border-[1.5px] flex items-center justify-center text-[9px] text-[#f7f4ee]"
                    style={{ borderColor: s.indicatorBorder, background: s.indicatorBg }}
                  >
                    {selected ? "✓" : ""}
                  </span>
                  {selected ? "比較から外す" : "比較に追加"}
                </button>
              </div>
            );
          })}
        </div>

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
          {sortedStores.map((store) => {
            const badgeBg = store.score >= 85 ? t.accent : "#eee6d0";
            return (
              <div
                key={store.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 font-bold text-xs px-2.5 py-1 rounded-full border-[1.5px] border-white shadow-[0_1px_4px_rgba(0,0,0,.2)] text-[#20201c]"
                style={{ top: store.pos.top, left: store.pos.left, background: badgeBg }}
              >
                {store.score}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-none px-8 py-4 bg-[#12202f] flex justify-between items-center">
        <div className="text-sm text-[#e4ded0]">
          {compareCount}件を比較トレイに追加中（2〜5件選択できます）
        </div>
        <button
          type="button"
          disabled={!canCompare}
          onClick={() => canCompare && navigate("/compare")}
          className="px-7 py-3 border-none rounded-md shadow-[0_1px_3px_rgba(0,0,0,.2)] font-bold text-sm cursor-pointer transition-colors disabled:cursor-not-allowed"
          style={canCompare ? { background: t.accent, color: "#20201c" } : { background: "#3a4a58", color: "#8a97a1" }}
        >
          比較する
        </button>
      </div>
    </div>
  );
}
