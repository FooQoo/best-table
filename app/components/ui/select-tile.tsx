import { getTheme, radioStyle } from "~/styles/theme";

type SelectTileProps = {
  label: string;
  desc?: string;
  selected: boolean;
  disabled?: boolean;
  round?: boolean;
  onClick: () => void;
};

export function SelectTile({
  label,
  desc,
  selected,
  disabled,
  round,
  onClick,
}: SelectTileProps) {
  const t = getTheme();
  const s = radioStyle(t, selected, disabled);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full box-border flex items-start gap-2.5 px-3.5 py-2.5 border-2 rounded-lg text-left text-[13px] transition-colors disabled:cursor-not-allowed"
      style={{ borderColor: s.borderColor, background: s.bg, color: s.color }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = s.hoverBg;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = s.bg;
      }}
    >
      <span
        className={`w-[15px] h-[15px] flex-none mt-0.5 border-[1.5px] flex items-center justify-center text-[9px] text-[#f7f4ee] ${round ? "rounded-full" : "rounded"}`}
        style={{ borderColor: s.indicatorBorder, background: s.indicatorBg }}
      >
        {selected ? "✓" : ""}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-bold text-[13px]">{label}</span>
        {desc && <span className="text-[11px] opacity-75">{desc}</span>}
      </span>
    </button>
  );
}
