import { useEffect, useRef, type ReactNode } from "react";
import { ConcernTags } from "~/components/ui/concern-tags";
import { ScoreBadge } from "~/components/ui/score-badge";
import { StorePhoto } from "~/components/ui/store-photo";
import { MAX_COMPARE_COUNT, type Restaurant } from "~/domain/models/restaurant";
import { GOLD } from "~/mocks/data";
import { getTheme, toggleButtonStyle } from "~/styles/theme";
import { GENRE_LABELS } from "~/utils/evidence-labels";
import { EMPHASIS_LABELS, getEmphasisKeys } from "~/utils/scoring";

export type StoreListScrollTarget = { storeId: string };

type StoreListProps = {
  stores: Restaurant[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  counterpartId: string | null;
  activeStoreId?: string | null;
  selectedStoreId?: string | null;
  onActivateStore?: (id: string) => void;
  onSelectStore?: (id: string) => void;
  // マップのピンをクリックしたときだけ設定する。hover による activeStoreId 変更では
  // スクロールしない（一覧を眺めているだけのユーザーの視点を勝手に動かさないため）。
  scrollTarget?: StoreListScrollTarget | null;
  footer?: ReactNode;
};

export function StoreList({
  stores,
  compareIds,
  onToggleCompare,
  counterpartId,
  activeStoreId,
  selectedStoreId,
  onActivateStore,
  onSelectStore,
  scrollTarget,
  footer,
}: StoreListProps) {
  const t = getTheme();
  const compareCount = compareIds.length;
  const emphasisKeys = getEmphasisKeys(counterpartId);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!scrollTarget) return;
    const card = cardRefs.current[scrollTarget.storeId];
    card?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [scrollTarget]);

  return (
    <div className="w-[400px] flex-none overflow-y-auto p-6 flex flex-col gap-4 bg-[#f7f4ee]">
      <div className="font-bold text-[15px]">
        接待安全度の高い順・{stores.length}件
      </div>
      {stores.map((store) => {
        const selected = compareIds.includes(store.id);
        const active = activeStoreId === store.id;
        const panelOpen = selectedStoreId === store.id;
        const disabled = !selected && compareCount >= MAX_COMPARE_COUNT;
        const s = toggleButtonStyle(t, selected, disabled);

        return (
          <div
            key={store.id}
            ref={(el) => {
              cardRefs.current[store.id] = el;
            }}
            data-store-card="true"
            data-active={active ? "true" : "false"}
            data-selected={panelOpen ? "true" : "false"}
            role="button"
            tabIndex={0}
            aria-label={`${store.name}の詳細を表示`}
            onClick={() => onSelectStore?.(store.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectStore?.(store.id);
              }
            }}
            onMouseEnter={() => onActivateStore?.(store.id)}
            onFocus={() => onActivateStore?.(store.id)}
            className="bg-white border-[1.5px] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-4 flex flex-col gap-2.5 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b08424]"
            style={{
              borderColor: active || panelOpen ? GOLD : "#e4ded0",
              boxShadow: panelOpen
                ? "0 0 0 3px rgba(176,132,36,.34),0 1px 5px rgba(0,0,0,.1)"
                : active
                  ? "0 0 0 2px rgba(176,132,36,.22),0 1px 4px rgba(0,0,0,.08)"
                  : undefined,
            }}
          >
            <div className="flex gap-3">
              <StorePhoto store={store} className="w-20 h-20 flex-none" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-[15px]">{store.name}</div>
                  <ScoreBadge score={store.score} />
                </div>
                <div className="text-xs text-[#79726a] mt-1">
                  {store.genre ? GENRE_LABELS[store.genre] : "ジャンル情報なし"}・{store.area}
                </div>
                <div className="text-xs text-[#79726a] mt-0.5">
                  個室：{store.room ?? "情報なし"}・予算目安：{store.budgetLabel ?? "情報なし"}
                </div>
              </div>
            </div>
            {emphasisKeys.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {emphasisKeys.map((key) => (
                  <span
                    key={key}
                    data-testid={`emphasis-${key}-${store.id}`}
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: GOLD, color: "#20201c" }}
                  >
                    {EMPHASIS_LABELS[key]}：{store[key] ?? "情報なし"}
                  </span>
                ))}
              </div>
            )}
            <ConcernTags storeId={store.id} concerns={store.concerns} />
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] text-[#8a6a1a] underline">
                クリックで詳細を表示
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCompare(store.id);
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                }}
                className="flex items-center gap-2 px-4 py-2 border-[1.5px] rounded-md text-[13px] cursor-pointer transition-colors disabled:cursor-not-allowed"
                style={{
                  borderColor: s.btnBorder,
                  background: s.btnBg,
                  color: s.btnColor,
                }}
              >
                <span
                  className="w-[13px] h-[13px] flex-none rounded-[3px] border-[1.5px] flex items-center justify-center text-[9px] text-[#f7f4ee]"
                  style={{
                    borderColor: s.indicatorBorder,
                    background: s.indicatorBg,
                  }}
                >
                  {selected ? "✓" : ""}
                </span>
                <span className="inline-block w-[6em] text-left">
                  {selected ? "比較から外す" : "比較に追加"}
                </span>
              </button>
            </div>
          </div>
        );
      })}
      {footer}
    </div>
  );
}
