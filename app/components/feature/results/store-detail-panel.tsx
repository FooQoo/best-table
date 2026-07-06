import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ConcernTags } from "~/components/ui/concern-tags";
import { MatchTierBadge } from "~/components/ui/match-tier-badge";
import { StorePhoto } from "~/components/ui/store-photo";
import type { Restaurant } from "~/domain/models/restaurant";
import { getAvailabilityMessage } from "~/utils/availability-message";
import {
  CONFIDENCE_LABELS,
  EVIDENCE_LABELS,
  GENRE_LABELS,
} from "~/utils/evidence-labels";
import { buildGoogleMapsUrl } from "~/utils/google-maps-url";
import { buildStoreQA } from "~/utils/store-qa";

type StoreDetailPanelProps = {
  store: Restaurant;
  onClose: () => void;
};

export function StoreDetailPanel({ store, onClose }: StoreDetailPanelProps) {
  const qa = buildStoreQA(store);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      const element =
        target instanceof Element ? target : target.parentElement;
      if (element?.closest("[data-store-card]")) return;
      if (element?.closest("[data-results-ai-chat]")) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <aside
      ref={panelRef}
      aria-label={`${store.name}の詳細`}
      className="absolute top-4 left-4 bottom-4 z-20 w-[420px] max-w-[calc(100%-32px)] overflow-y-auto rounded-md border-[1.5px] border-[#d8c79d] bg-[#fffdf8] shadow-[0_10px_30px_rgba(20,20,20,.22)] duration-150 animate-in fade-in-0 slide-in-from-left-2"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e4ded0] bg-[#fffdf8]/95 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <h2 className="m-0 truncate font-serif text-xl font-bold text-[#20201c]">
            {store.name}
          </h2>
          <div className="mt-1 text-xs text-[#79726a]">
            {store.genre ? GENRE_LABELS[store.genre] : "ジャンル情報なし"}・
            {store.area}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 flex-none place-items-center rounded-full border border-[#ddd4c2] bg-white text-[#4a463f] transition-colors hover:bg-[#f7f4ee]"
          aria-label="詳細を閉じる"
          title="詳細を閉じる"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5 pb-7">
        <div className="flex gap-4">
          <StorePhoto store={store} className="h-28 w-28 flex-none" />
          <div className="min-w-0 flex-1 space-y-2 text-[13px] text-[#79726a]">
            <div className="flex items-center gap-2">
              <MatchTierBadge tier={store.matchTier} />
              <span>マッチ度</span>
            </div>
            <div>個室：{store.room ?? "情報なし"}</div>
            <div>予算目安：{store.budgetLabel ?? "情報なし"}</div>
            <div>アクセス：{store.access ?? "情報なし"}</div>
            <div>連絡先：{store.phone ?? "情報なし"}</div>
            <div data-testid="results-detail-availability">
              空席状況：{getAvailabilityMessage()}
            </div>
            <a
              href={buildGoogleMapsUrl(store)}
              target="_blank"
              rel="noopener"
              className="inline-block text-[#8a6a1f] underline underline-offset-2"
            >
              Google Mapで開く
            </a>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <div className="text-[15px] font-bold">AIによる推奨理由</div>
          <p className="m-0 text-[13px] leading-relaxed text-[#4a463f]">
            {store.matchingSummary ?? "推奨理由はまだ生成されていません。"}
          </p>
          {store.confidence && (
            <div className="text-xs text-[#79726a]">
              根拠:{" "}
              {store.evidence.map((e) => EVIDENCE_LABELS[e]).join("・") ||
                "情報なし"}
              ｜確信度: {CONFIDENCE_LABELS[store.confidence]}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="text-[15px] font-bold">懸念点</div>
          <ConcernTags storeId={store.id} concerns={store.concerns} />
        </section>

        <section className="flex flex-col gap-3 border-t border-[#e4ded0] pt-4">
          <div className="text-[15px] font-bold">よくある質問への回答例</div>
          {qa.map((item) => (
            <div key={item.question} className="flex flex-col gap-1">
              <div className="text-[13px] font-bold">Q. {item.question}</div>
              <p className="m-0 text-[13px] leading-relaxed text-[#4a463f]">
                A. {item.answer}
              </p>
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
}
