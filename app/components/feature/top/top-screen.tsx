import { useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { AreaPicker } from "~/components/feature/top/area-picker";
import { Input } from "~/components/ui/input";
import { QuantityStepper } from "~/components/ui/quantity-stepper";
import {
  useBookingQuery,
  DEFAULT_BOOKING_QUERY,
} from "~/state/booking-query-state";
import { GOLD } from "~/mocks/data";

export function TopScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useBookingQuery();

  useEffect(() => {
    // URLに何も指定がない場合、初期値をURLに明示的に書き込む（上書き）
    if (location.search === "" || location.search === "?") {
      query.setQueryState(DEFAULT_BOOKING_QUERY);
    }
  }, []);

  return (
    <div>
      <TopHero />

      <div className="relative mx-4 -mt-[44px] max-w-[760px] rounded-md border-[1.5px] border-[#e4ded0] bg-white px-4 py-5 shadow-[0_6px_20px_rgba(20,20,20,.14)] sm:mx-auto sm:-mt-[52px] sm:px-8 sm:py-7">
        <div className="flex flex-col gap-3 relative sm:flex-row sm:flex-wrap">
          <AreaPicker />

          <Input
            type="date"
            value={query.date}
            onChange={(e) => query.setDate(e.target.value)}
            className="h-auto w-full rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px] sm:w-auto sm:flex-none"
          />
          <Input
            type="time"
            value={query.time}
            onChange={(e) => query.setTime(e.target.value)}
            className="h-auto w-full rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px] sm:w-auto sm:flex-none"
          />

          <QuantityStepper
            value={query.people}
            labelSuffix="名"
            onIncrement={query.incPeople}
            onDecrement={query.decPeople}
          />
        </div>

        <div className="mt-6 flex justify-stretch border-t border-[#eee6d6] pt-5 sm:justify-end">
          <button
            type="button"
            onClick={() =>
              navigate({ pathname: "/hearing", search: location.search })
            }
            className="w-full rounded-md border-none px-[30px] py-[15px] text-[15px] font-bold text-[#20201c] shadow-[0_1px_3px_rgba(20,20,20,.2)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.65)] sm:w-auto sm:flex-none"
            style={{ background: GOLD }}
          >
            AIに相談してお店を選ぶ
          </button>
        </div>
      </div>
    </div>
  );
}

function TopHero() {
  return (
    <div
      className="relative h-[260px] overflow-hidden sm:h-[300px]"
      style={{
        background:
          "repeating-linear-gradient(45deg,#3a3226,#3a3226 12px,#332b20 12px,#332b20 24px)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(18,32,47,.2),rgba(18,32,47,.8))",
        }}
      />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
        <div
          className="mb-3 max-w-[12em] font-serif text-[27px] font-bold leading-tight sm:max-w-none sm:text-[32px]"
          style={{ color: GOLD }}
        >
          大切な会食を、失敗しない選択に。
        </div>
        <div className="text-[14px] text-[#e4ded0] sm:text-[15px]">
          接待・会食に強い、お店選びのAIサービス
        </div>
      </div>
    </div>
  );
}
