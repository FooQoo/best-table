import { useState } from "react";
import { useNavigate } from "react-router";
import { useBooking } from "~/lib/booking-context";
import { GOLD } from "~/lib/data";
import { BudgetStep } from "~/components/feature/hearing/budget-step";
import { CounterpartStep } from "~/components/feature/hearing/counterpart-step";
import { PriorityStep } from "~/components/feature/hearing/priority-step";

const STEP_LABELS = ["相手", "ご予算", "重視条件"] as const;
type HearingStep = 0 | 1 | 2;

export function HearingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<HearingStep>(0);
  const { state } = useBooking();

  const canNextStep0 = !!state.counterpart && !(state.counterpart === "other" && !state.counterpartOtherText.trim());
  const canNextStep1 = !(state.budgetOtherOn && !state.budgetOtherText.trim());
  const canSubmit = state.priorities.length > 0 || (state.priorityOtherOn && !!state.priorityOtherText.trim());
  const enabledByStep = [canNextStep0, canNextStep1, canSubmit];
  const primaryEnabled = enabledByStep[step];
  const primaryLabel = step < 2 ? "次へ" : "この条件で検索する";
  const backLabel = step === 0 ? "TOPに戻る" : "戻る";

  const handlePrimary = () => {
    if (!primaryEnabled) return;
    if (step < 2) {
      setStep((step + 1) as HearingStep);
    } else {
      navigate("/results");
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate("/");
    } else {
      setStep((step - 1) as HearingStep);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex justify-center items-start px-6 py-8 box-border overflow-y-auto">
      <div className="w-[720px] max-w-full max-h-full flex flex-col">
        <StepProgress step={step} />

        <h1 className="font-serif font-bold text-[22px] my-2.5 mb-3.5 flex-none">
          今回の会食について、少しだけ教えてください
        </h1>

        <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] px-[42px] py-9 overflow-y-auto h-[600px] box-border flex-none">
          {step === 0 && <CounterpartStep />}
          {step === 1 && <BudgetStep />}
          {step === 2 && <PriorityStep />}
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

function StepProgress({ step }: { step: HearingStep }) {
  return (
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
  );
}
