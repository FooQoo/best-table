import { getTheme } from "~/styles/theme";

type CompareTrayProps = {
  compareCount: number;
  canCompare: boolean;
  onCompare: () => void;
};

export function CompareTray({
  compareCount,
  canCompare,
  onCompare,
}: CompareTrayProps) {
  const t = getTheme();

  return (
    <div className="flex-none px-8 py-4 bg-[#12202f] flex justify-between items-center">
      <div className="text-sm text-[#e4ded0]">
        {compareCount}件を比較トレイに追加中（2〜5件選択できます）
      </div>
      <button
        type="button"
        disabled={!canCompare}
        onClick={onCompare}
        className="px-7 py-3 border-none rounded-md shadow-[0_1px_3px_rgba(0,0,0,.2)] font-bold text-sm cursor-pointer transition-colors disabled:cursor-not-allowed"
        style={
          canCompare
            ? { background: t.accent, color: "#20201c" }
            : { background: "#3a4a58", color: "#8a97a1" }
        }
      >
        比較する
      </button>
    </div>
  );
}
