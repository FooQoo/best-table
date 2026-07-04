import { GOLD, NAVY, type Store } from "~/lib/data";

type FinalStorePanelProps = {
  store: Store;
};

export function FinalStorePanel({ store }: FinalStorePanelProps) {
  return (
    <div className="mt-7 bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] px-8 py-7">
      <div className="font-serif font-bold text-lg mb-1">{store.name}</div>
      <div className="text-[13px] text-[#79726a] mb-5">
        {store.genre}・{store.area}・個室：{store.room}
      </div>

      <div className="flex gap-7 flex-wrap">
        <div className="flex-1 min-w-[220px] flex flex-col gap-3.5">
          <div>
            <div className="font-bold text-xs text-[#79726a] mb-1">連絡先</div>
            <div className="text-[15px]">{store.phone}</div>
          </div>
          <div>
            <div className="font-bold text-xs text-[#79726a] mb-1">アクセス</div>
            <div className="text-[15px]">{store.access}</div>
          </div>
          <a
            href="#"
            target="_blank"
            rel="noopener"
            className="mt-2 self-start px-6 py-3 rounded-md font-bold text-sm no-underline transition-colors"
            style={{ background: NAVY, color: GOLD }}
          >
            一休で予約する
          </a>
        </div>
        <div
          className="flex-1 min-w-[220px] h-[180px] relative overflow-hidden rounded-md bg-[#e9e4d6]"
          style={{
            backgroundImage:
              "linear-gradient(0deg,rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="absolute top-3 left-3 text-[11px] font-mono text-[#8a8474]">
            地図（プレースホルダー）
          </div>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,.3)]"
            style={{ background: GOLD }}
          />
        </div>
      </div>
    </div>
  );
}
