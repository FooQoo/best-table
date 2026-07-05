import { Link } from "react-router";
import { ConcernTags } from "~/components/ui/concern-tags";
import { ScoreBadge } from "~/components/ui/score-badge";
import { StorePhotoPlaceholder } from "~/components/ui/store-photo-placeholder";
import { MAX_COMPARE_COUNT } from "~/domain/models/restaurant";
import { GOLD, type Store } from "~/mocks/data";
import { getTheme, toggleButtonStyle } from "~/styles/theme";
import { EMPHASIS_LABELS, getEmphasisKeys } from "~/utils/scoring";

type StoreListProps = {
  stores: Store[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  counterpartId: string | null;
};

export function StoreList({
  stores,
  compareIds,
  onToggleCompare,
  counterpartId,
}: StoreListProps) {
  const t = getTheme();
  const compareCount = compareIds.length;
  const emphasisKeys = getEmphasisKeys(counterpartId);

  return (
    <div className="w-[400px] flex-none overflow-y-auto p-6 flex flex-col gap-4 bg-[#f7f4ee]">
      <div className="font-bold text-[15px]">
        接待安全度の高い順・{stores.length}件
      </div>
      {stores.map((store) => {
        const selected = compareIds.includes(store.id);
        const disabled = !selected && compareCount >= MAX_COMPARE_COUNT;
        const s = toggleButtonStyle(t, selected, disabled);

        return (
          <div
            key={store.id}
            className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-4 flex flex-col gap-2.5"
          >
            <div className="flex gap-3">
              <StorePhotoPlaceholder
                label={store.photoPlaceholderLabel}
                className="w-20 h-20 flex-none"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-[15px]">{store.name}</div>
                  <ScoreBadge score={store.score} />
                </div>
                <div className="text-xs text-[#79726a] mt-1">
                  {store.genre}・{store.area}
                </div>
                <div className="text-xs text-[#79726a] mt-0.5">
                  個室：{store.room}・予算目安：{store.budgetLabel ?? "情報なし"}
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
                    {EMPHASIS_LABELS[key]}：{store[key]}
                  </span>
                ))}
              </div>
            )}
            <ConcernTags storeId={store.id} concerns={store.concerns} />
            <div className="flex items-center justify-between gap-2">
              <Link
                to={`/stores/${store.id}`}
                className="text-[13px] text-[#8a6a1a] underline"
              >
                詳細を見る
              </Link>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleCompare(store.id)}
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
                {selected ? "比較から外す" : "比較に追加"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
