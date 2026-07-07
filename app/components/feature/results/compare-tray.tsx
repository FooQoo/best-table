import { getTheme } from "~/styles/theme";

type CompareTrayProps = {
  compareCount: number;
  canCompare: boolean;
  isCompareOpen: boolean;
  onToggleCompare: () => void;
};

export function CompareTray({
  compareCount,
  canCompare,
  isCompareOpen,
  onToggleCompare,
}: CompareTrayProps) {
  const t = getTheme();
  const isDisabled = !isCompareOpen && !canCompare;

  return (
    <div className="flex flex-none flex-col gap-3 bg-[#12202f] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4">
      <div className="text-sm leading-relaxed text-[#e4ded0]">
        {compareCount}件を比較トレイに追加中（2〜5件選択できます）
      </div>
      <button
        type="button"
        disabled={isDisabled}
        aria-pressed={isCompareOpen}
        onClick={onToggleCompare}
        className="w-full rounded-md border-none px-7 py-3 text-sm font-bold shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-colors cursor-pointer disabled:cursor-not-allowed sm:w-auto"
        style={
          !isDisabled
            ? { background: t.accent, color: "#20201c" }
            : { background: "#3a4a58", color: "#8a97a1" }
        }
      >
        <span className="inline-block w-[6em] text-center">
          {isCompareOpen ? "比較を閉じる" : "比較する"}
        </span>
      </button>
    </div>
  );
}
