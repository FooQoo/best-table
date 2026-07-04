import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useBooking } from "~/lib/booking-context";
import { BUDGET_STEPS, GOLD } from "~/lib/data";

export function BudgetStep() {
  const { state, setBudgetMin, setBudgetMax, toggleBudgetOther, setBudgetOtherText } = useBooking();

  return (
    <div>
      <div className="font-bold text-[15px] mb-1">ご予算はどのくらいですか？</div>
      <div className="text-xs text-[#79726a] mb-3.5">
        選択した予算感をもとに、候補店舗を絞り込みます。
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={state.budgetMin} onValueChange={setBudgetMin}>
          <SelectTrigger className="flex-1 min-w-[160px] h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-3 py-2.5 text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_STEPS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[#79726a]">〜</span>
        <Select value={state.budgetMax} onValueChange={setBudgetMax}>
          <SelectTrigger className="flex-1 min-w-[160px] h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-3 py-2.5 text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_STEPS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={toggleBudgetOther}
          className="flex items-center gap-2 px-[18px] py-2.5 border-2 rounded-full text-sm cursor-pointer transition-colors"
          style={
            state.budgetOtherOn
              ? { borderColor: GOLD, background: "#12202f", color: "#f7f4ee" }
              : { borderColor: "#d8d2c0", background: "#fff", color: "#20201c" }
          }
        >
          <span
            className="w-[13px] h-[13px] flex-none rounded-[3px] border-[1.5px] flex items-center justify-center text-[9px]"
            style={{
              borderColor: state.budgetOtherOn ? GOLD : "#b8b09a",
              background: state.budgetOtherOn ? GOLD : "transparent",
              color: "#20201c",
            }}
          >
            {state.budgetOtherOn ? "✓" : ""}
          </span>
          その他（自由記述）
        </button>
      </div>
      {state.budgetOtherOn && (
        <Input
          type="text"
          placeholder="自由にご記入ください（例：1人2万円くらいまで）"
          value={state.budgetOtherText}
          onChange={(e) => setBudgetOtherText(e.target.value)}
          className="w-full h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px] mt-3.5"
        />
      )}
    </div>
  );
}
