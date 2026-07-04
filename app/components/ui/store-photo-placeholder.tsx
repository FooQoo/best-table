type StorePhotoPlaceholderProps = {
  label: string;
  className?: string;
};

export function StorePhotoPlaceholder({ label, className = "" }: StorePhotoPlaceholderProps) {
  return (
    <div
      className={`border border-dashed border-[#b3ab98] flex items-center justify-center text-[11px] font-mono text-[#6b6552] text-center ${className}`}
      style={{
        background: "repeating-linear-gradient(45deg,#e4e0d5,#e4e0d5 6px,#d8d3c4 6px,#d8d3c4 12px)",
      }}
    >
      {label}
    </div>
  );
}
