import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useBookingQuery } from "~/state/booking-query-state";
import { GOLD } from "~/mocks/data";
import { BudgetStep } from "~/components/feature/hearing/budget-step";
import { CounterpartStep } from "~/components/feature/hearing/counterpart-step";
import { PriorityStep } from "~/components/feature/hearing/priority-step";

const STEP_LABELS = ["相手", "ご予算", "重視条件"] as const;
type HearingStep = 0 | 1 | 2;

export function HearingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<HearingStep>(0);
  const query = useBookingQuery();

  const canNextStep0 =
    !!query.counterpart &&
    !(query.counterpart === "other" && !query.counterpartOtherText.trim());
  const canNextStep1 = !(query.budgetOtherOn && !query.budgetOtherText.trim());
  const canSubmit =
    query.priorities.length > 0 ||
    (query.priorityOtherOn && !!query.priorityOtherText.trim());
  const enabledByStep = [canNextStep0, canNextStep1, canSubmit];
  const primaryEnabled = enabledByStep[step];
  const primaryLabel = step < 2 ? "次へ" : "この条件で検索する";
  const backLabel = step === 0 ? "TOPに戻る" : "戻る";

  const handlePrimary = () => {
    if (!primaryEnabled) return;
    if (step < 2) {
      setStep((step + 1) as HearingStep);
    } else {
      navigate({ pathname: "/results", search: location.search });
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate({ pathname: "/", search: location.search });
    } else {
      setStep((step - 1) as HearingStep);
    }
  };

  return (
    <div className="box-border flex min-h-[calc(100dvh-64px)] justify-center overflow-y-auto px-4 py-5 sm:h-[calc(100dvh-64px)] sm:items-start sm:px-6 sm:py-8">
      <div className="flex w-[720px] max-w-full flex-col sm:max-h-full">
        <StepProgress step={step} />

        <h1 className="my-2.5 mb-3.5 flex-none font-serif text-[20px] font-bold leading-snug sm:text-[22px]">
          今回の会食について、少しだけ教えてください
        </h1>

        <div className="box-border flex-none overflow-y-auto rounded-md border-[1.5px] border-[#e4ded0] bg-white px-4 py-5 shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] sm:h-[600px] sm:px-[42px] sm:py-9">
          {step === 0 && <CounterpartStep />}
          {step === 1 && <BudgetStep />}
          {step === 2 && <PriorityStep />}
        </div>

        <div className="mt-3.5 flex flex-none items-center justify-between gap-3">
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
            className="min-w-[9em] rounded-md border-none px-5 py-3.5 text-[15px] font-bold shadow-[0_1px_3px_rgba(20,20,20,.12),0_1px_2px_rgba(20,20,20,.06)] transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)] sm:px-8"
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
