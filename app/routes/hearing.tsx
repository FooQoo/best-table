import { useState } from "react";
import { useNavigate } from "react-router";
import { SelectTile } from "~/components/select-tile";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useBooking } from "~/lib/booking-context";
import { BUDGET_STEPS, COUNTERPARTS, GOLD, PRIORITIES } from "~/lib/data";

const STEP_LABELS = ["相手", "ご予算", "重視条件"];

export default function HearingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const {
    state,
    setCounterpart,
    setCounterpartOtherText,
    setBudgetMin,
    setBudgetMax,
    toggleBudgetOther,
    setBudgetOtherText,
    togglePriority,
    togglePriorityOther,
    setPriorityOtherText,
  } = useBooking();

  const canNextStep0 = !!state.counterpart && !(state.counterpart === "other" && !state.counterpartOtherText.trim());
  const canNextStep1 = !(state.budgetOtherOn && !state.budgetOtherText.trim());
  const canSubmit = state.priorities.length > 0 || (state.priorityOtherOn && !!state.priorityOtherText.trim());
  const enabledByStep = [canNextStep0, canNextStep1, canSubmit];
  const primaryEnabled = enabledByStep[step];
  const primaryLabel = step < 2 ? "次へ" : "この条件で検索する";
  const backLabel = step === 0 ? "TOPに戻る" : "戻る";
  const priorityLimitReached = state.priorities.length >= 3;

  const handlePrimary = () => {
    if (!primaryEnabled) return;
    if (step < 2) {
      setStep(step + 1);
    } else {
      navigate("/results");
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate("/");
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex justify-center items-start px-6 py-8 box-border overflow-y-auto">
      <div className="w-[720px] max-w-full max-h-full flex flex-col">
        <div className="flex items-center gap-2.5 mb-1 flex-none">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className="w-[9px] h-[9px] rounded-full"
              style={{ background: i <= step ? GOLD : "#d8d2c0" }}
            />
          ))}
          <span className="text-xs text-[#79726a] ml-2">
            STEP {step + 1} / 3・{STEP_LABELS[step]}
          </span>
        </div>

        <h1 className="font-serif font-bold text-[22px] my-2.5 mb-3.5 flex-none">
          今回の会食について、少しだけ教えてください
        </h1>

        <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] px-[42px] py-9 overflow-y-auto h-[600px] box-border flex-none">
          {step === 0 && (
            <div>
              <div className="font-bold text-[15px] mb-1">今回は、どんな会食ですか？</div>
              <div className="text-xs text-[#79726a] mb-3.5">
                選択内容をもとに、AIが重視すべき比較軸を調整します。
              </div>
              <div className="flex flex-col gap-1.5">
                {COUNTERPARTS.map((c) => (
                  <SelectTile
                    key={c.id}
                    label={c.label}
                    desc={c.desc}
                    round
                    selected={state.counterpart === c.id}
                    onClick={() => setCounterpart(c.id)}
                  />
                ))}
                <SelectTile
                  label="その他"
                  desc="自由に入力する"
                  round
                  selected={state.counterpart === "other"}
                  onClick={() => setCounterpart("other")}
                />
                {state.counterpart === "other" && (
                  <Input
                    type="text"
                    placeholder="自由にご記入ください"
                    value={state.counterpartOtherText}
                    onChange={(e) => setCounterpartOtherText(e.target.value)}
                    className="w-full h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px]"
                  />
                )}
              </div>
            </div>
          )}

          {step === 1 && (
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
          )}

          {step === 2 && (
            <div>
              <div className="font-bold text-[15px] mb-1">
                この会食で、特に外したくないことは何ですか？
              </div>
              <div className="text-xs text-[#79726a] mb-3.5">
                最大3つまで選択してください。選んだ条件をもとに、検索結果の接待安全度と比較表を調整します。
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => {
                  const selected = state.priorities.includes(p.key);
                  const disabled = !selected && priorityLimitReached;
                  return (
                    <SelectTile
                      key={p.key}
                      label={p.label}
                      desc={p.desc}
                      selected={selected}
                      disabled={disabled}
                      onClick={() => togglePriority(p.key)}
                    />
                  );
                })}
              </div>
              <div className="mt-2">
                <SelectTile
                  label="苦手・避けたい条件がある"
                  desc="避けたい席・雰囲気などを自由にご記入いただけます"
                  selected={state.priorityOtherOn}
                  onClick={togglePriorityOther}
                />
              </div>
              {state.priorityOtherOn && (
                <Input
                  type="text"
                  placeholder="自由にご記入ください（例：完全個室以外は避けたい）"
                  value={state.priorityOtherText}
                  onChange={(e) => setPriorityOtherText(e.target.value)}
                  className="w-full h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px] mt-2.5"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-3.5 flex-none">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-[#79726a] bg-transparent border-none cursor-pointer px-1 py-2.5 rounded hover:text-[#20201c] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
          >
            {backLabel}
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={!primaryEnabled}
            className="px-8 py-3.5 border-none rounded-md shadow-[0_1px_3px_rgba(20,20,20,.12),0_1px_2px_rgba(20,20,20,.06)] font-bold text-[15px] cursor-pointer transition-colors disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
            style={
              primaryEnabled
                ? { background: "#12202f", color: "#f7f4ee" }
                : { background: "#e4ded0", color: "#a39d8c" }
            }
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
