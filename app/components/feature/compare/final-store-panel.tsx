import type { Restaurant } from "~/domain/models/restaurant";
import { GOLD, NAVY } from "~/mocks/data";
import { buildFinalStoreMessage } from "~/utils/final-candidate-message";
import { buildGoogleMapsUrl } from "~/utils/google-maps-url";
import { RestaurantMap } from "~/components/feature/maps/restaurant-map";

type FinalStorePanelProps = {
  store: Restaurant;
  counterpartId: string | null;
  priorities: string[];
};

export function FinalStorePanel({
  store,
  counterpartId,
  priorities,
}: FinalStorePanelProps) {
  const message = buildFinalStoreMessage(store, {
    counterpart: counterpartId,
    priorities,
  });
  const googleMapsUrl = buildGoogleMapsUrl(store);

  return (
    <div className="mt-7 bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] px-8 py-7">
      <div className="font-serif font-bold text-lg mb-1">{store.name}</div>
      <div className="text-[13px] text-[#79726a] mb-5">
        {store.genre ?? "ジャンル情報なし"}・{store.area}・個室：
        {store.room ?? "情報なし"}
      </div>

      <div className="mb-5">
        <div className="font-bold text-xs text-[#79726a] mb-1">
          この店舗を選んだ理由
        </div>
        <p className="text-[14px] leading-relaxed m-0">{message.reason}</p>
      </div>

      <div className="mb-6">
        <div className="font-bold text-xs text-[#79726a] mb-1">
          予約前の確認事項
        </div>
        <ul className="text-[14px] leading-relaxed m-0 pl-5 list-disc">
          {message.checksBeforeBooking.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </div>

      <div className="flex gap-7 flex-wrap">
        <div className="flex-1 min-w-[220px] flex flex-col gap-3.5">
          <div>
            <div className="font-bold text-xs text-[#79726a] mb-1">連絡先</div>
            <div className="text-[15px]">{store.phone ?? "情報なし"}</div>
          </div>
          <div>
            <div className="font-bold text-xs text-[#79726a] mb-1">
              アクセス
            </div>
            <div className="text-[15px]">{store.access ?? "情報なし"}</div>
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener"
            className="mt-2 self-start px-6 py-3 rounded-md font-bold text-sm no-underline transition-colors"
            style={{ background: NAVY, color: GOLD }}
          >
            Google Mapで開く
          </a>
        </div>
        <FinalStoreMap store={store} />
      </div>
    </div>
  );
}

function FinalStoreMap({ store }: { store: Restaurant }) {
  return (
    <div className="flex-1 min-w-[220px] h-[180px] relative overflow-hidden rounded-md bg-[#e9e4d6]">
      <div className="absolute top-3 left-3 z-10 text-[11px] font-mono text-[#8a8474] bg-[#f7f4ee]/90 border border-[#ddd4c2] rounded px-2 py-1">
        {store.location ? "最終候補の地図" : "地図情報なし"}
      </div>
      <RestaurantMap
        restaurants={store.location ? [store] : []}
        activeRestaurantId={store.id}
        emptyLabel="地図情報なし"
      />
    </div>
  );
}
