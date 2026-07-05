import { SelectTile } from "~/components/ui/select-tile";
import { Input } from "~/components/ui/input";
import { useBooking } from "~/state/booking-context";
import { COUNTERPARTS } from "~/mocks/data";

export function CounterpartStep() {
  const { state, setCounterpart, setCounterpartOtherText } = useBooking();

  return (
    <div>
      <div className="font-bold text-[15px] mb-1">
        今回は、どんな会食ですか？
      </div>
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
  );
}
