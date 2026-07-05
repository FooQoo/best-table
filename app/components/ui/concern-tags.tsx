import type { ConcernItem } from "~/domain/models/restaurant";
import { EVIDENCE_LABELS } from "~/utils/evidence-labels";

type ConcernTagsProps = {
  storeId: string;
  concerns: ConcernItem[];
};

export function ConcernTags({ storeId, concerns }: ConcernTagsProps) {
  if (concerns.length === 0) {
    return (
      <div
        data-testid={`concern-tags-${storeId}`}
        className="text-xs"
        style={{ color: "#79726a" }}
      >
        懸念点は特になし
      </div>
    );
  }

  return (
    <div
      data-testid={`concern-tags-${storeId}`}
      className="flex flex-wrap gap-1.5"
    >
      {concerns.map((concern) => (
        <span
          key={concern.text}
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "#f5e9d8", color: "#9a6a2a" }}
        >
          ⚠ {concern.text}
          {concern.evidence.length > 0 && (
            <span className="ml-1 opacity-70">
              （根拠: {concern.evidence.map((e) => EVIDENCE_LABELS[e]).join("・")}）
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
