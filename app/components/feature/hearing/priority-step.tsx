import { Input } from "~/components/ui/input";
import { SelectTile } from "~/components/ui/select-tile";
import { useBookingQuery } from "~/state/booking-query-state";
import { PRIORITIES } from "~/mocks/data";

export function PriorityStep() {
  const query = useBookingQuery();
  const priorityLimitReached = query.priorities.length >= 3;

  return (
    <div>
      <div className="font-bold text-[15px] mb-1">
        この会食で、特に外したくないことは何ですか？
      </div>
      <div className="text-xs text-[#79726a] mb-3.5">
        最大3つまで選択してください。選んだ条件をもとに、検索結果のマッチ度と比較表を調整します。
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PRIORITIES.map((p) => {
          const selected = query.priorities.includes(p.key);
          const disabled = !selected && priorityLimitReached;
          return (
            <SelectTile
              key={p.key}
              label={p.label}
              desc={p.desc}
              selected={selected}
              disabled={disabled}
              onClick={() => query.togglePriority(p.key)}
            />
          );
        })}
      </div>
      <div className="mt-2">
        <SelectTile
          label="苦手・避けたい条件がある"
          desc="避けたい席・雰囲気などを自由にご記入いただけます"
          selected={query.priorityOtherOn}
          onClick={query.togglePriorityOther}
        />
      </div>
      {query.priorityOtherOn && (
        <Input
          type="text"
          placeholder="自由にご記入ください（例：完全個室以外は避けたい）"
          value={query.priorityOtherText}
          onChange={(e) => query.setPriorityOtherText(e.target.value)}
          className="w-full h-auto rounded-md border-[1.5px] border-[#d8d2c0] px-2.5 py-2 text-[15px] mt-2.5"
        />
      )}
    </div>
  );
}
