import { Link, useParams } from "react-router";
import { ConcernTags } from "~/components/ui/concern-tags";
import { ScoreBadge } from "~/components/ui/score-badge";
import { StorePhotoPlaceholder } from "~/components/ui/store-photo-placeholder";
import { STORES } from "~/mocks/data";
import { CONFIDENCE_LABELS, EVIDENCE_LABELS } from "~/utils/evidence-labels";
import { buildStoreQA } from "~/utils/store-qa";

export function StoreDetailScreen() {
  const { storeId } = useParams();
  const store = STORES.find((s) => s.id === storeId);

  if (!store) {
    return (
      <div className="flex-1 p-10 flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-[#79726a]">店舗が見つかりませんでした。</div>
        <Link to="/results" className="text-sm text-[#8a6a1a] underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const qa = buildStoreQA(store);

  return (
    <div className="flex-1 p-10 flex justify-center">
      <div className="w-full max-w-[760px] flex flex-col gap-6">
        <div className="flex justify-between items-baseline">
          <h1 className="font-serif font-bold text-2xl m-0">{store.name}</h1>
          <Link
            to="/results"
            className="text-[13px] text-[#8a6a1a] underline"
          >
            一覧に戻る
          </Link>
        </div>

        <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-6 flex gap-5">
          <StorePhotoPlaceholder label={store.photoPlaceholderLabel} className="w-32 h-32 flex-none" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="text-[13px] text-[#79726a]">
                {store.genre}・{store.area}
              </div>
              <ScoreBadge score={store.score} />
            </div>
            <div className="text-[13px] text-[#79726a]">個室：{store.room}</div>
            <div className="text-[13px] text-[#79726a]">
              予算目安：{store.budgetLabel ?? "情報なし"}
            </div>
            <div className="text-[13px] text-[#79726a]">
              アクセス：{store.access}
            </div>
            <div className="text-[13px] text-[#79726a]">
              連絡先：{store.phone}
            </div>
          </div>
        </div>

        <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-6 flex flex-col gap-3">
          <div className="font-bold text-[15px]">AIによる推奨理由</div>
          <p className="text-[13px] leading-relaxed m-0">
            {store.matchingSummary}
          </p>
          {store.confidence && (
            <div className="text-xs" style={{ color: "#79726a" }}>
              根拠: {store.evidence.map((e) => EVIDENCE_LABELS[e]).join("・") || "情報なし"}
              ｜確信度: {CONFIDENCE_LABELS[store.confidence]}
            </div>
          )}
          <div>
            <div className="font-bold text-xs text-[#79726a] mb-1.5">
              懸念点
            </div>
            <ConcernTags storeId={store.id} concerns={store.concerns} />
          </div>
        </div>

        <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-6 flex flex-col gap-4">
          <div className="font-bold text-[15px]">よくある質問への回答例</div>
          {qa.map((item) => (
            <div key={item.question} className="flex flex-col gap-1">
              <div className="font-bold text-[13px]">Q. {item.question}</div>
              <p className="text-[13px] text-[#4a463f] leading-relaxed m-0">
                A. {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
