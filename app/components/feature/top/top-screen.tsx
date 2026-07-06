import { useLocation, useNavigate } from "react-router";
import { AreaPicker } from "~/components/feature/top/area-picker";
import { Input } from "~/components/ui/input";
import { QuantityStepper } from "~/components/ui/quantity-stepper";
import { useBookingQuery } from "~/state/booking-query-state";
import { GOLD } from "~/mocks/data";

export function TopScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useBookingQuery();

  return (
    <div>
      <TopHero />

      <div className="max-w-[760px] mx-auto -mt-[52px] relative bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_6px_20px_rgba(20,20,20,.14)] px-8 py-7">
        <div className="flex gap-3 flex-wrap relative">
          <AreaPicker />

          <Input
            type="date"
            value={query.date}
            onChange={(e) => query.setDate(e.target.value)}
            className="flex-none w-auto h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px]"
          />
          <Input
            type="time"
            value={query.time}
            onChange={(e) => query.setTime(e.target.value)}
            className="flex-none w-auto h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px]"
          />

          <QuantityStepper
            value={query.people}
            labelSuffix="名"
            onIncrement={query.incPeople}
            onDecrement={query.decPeople}
          />
        </div>

        <div className="border-t border-[#eee6d6] mt-6 pt-5 flex justify-end">
          <button
            type="button"
            onClick={() =>
              navigate({ pathname: "/hearing", search: location.search })
            }
            className="flex-none px-[30px] py-[15px] border-none rounded-md shadow-[0_1px_3px_rgba(20,20,20,.2)] font-bold text-[15px] text-[#20201c] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.65)]"
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
      className="relative h-[300px] overflow-hidden"
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
          className="font-serif font-bold text-[32px] mb-3"
          style={{ color: GOLD }}
        >
          大切な会食を、失敗しない選択に。
        </div>
        <div className="text-[15px] text-[#e4ded0]">
          接待・会食に強い、お店選びのAIサービス
        </div>
      </div>
    </div>
  );
}
