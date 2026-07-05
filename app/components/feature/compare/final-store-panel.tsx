import type { Restaurant } from "~/domain/models/restaurant";
import { GOLD, NAVY } from "~/mocks/data";
import { buildFinalStoreMessage } from "~/utils/final-candidate-message";

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

function buildGoogleMapsUrl(store: Restaurant): string {
  if (store.placeId?.startsWith("places/")) {
    const placeId = store.placeId.replace(/^places\//, "");
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  }

  const query = [store.name, store.address ?? store.area]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function FinalStoreMap({ store }: { store: Restaurant }) {
  return (
    <div
      className="flex-1 min-w-[220px] h-[180px] relative overflow-hidden rounded-md bg-[#e9e4d6]"
      style={{
        backgroundImage:
          "linear-gradient(0deg,rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="absolute top-3 left-3 text-[11px] font-mono text-[#8a8474]">
        {store.location ? "最終候補の地図（座標付きモック）" : "地図情報なし"}
      </div>
      {store.location ? (
        <>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,.3)]"
            style={{ background: GOLD }}
          />
          <div className="absolute left-4 bottom-4 text-[11px] text-[#79726a]">
            {store.location.lat.toFixed(5)}, {store.location.lng.toFixed(5)}
          </div>
        </>
      ) : (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-[13px] leading-relaxed text-[#79726a]">
          この店舗は座標を取得できていないため、地図マーカーは表示しません。
        </div>
      )}
    </div>
  );
}
