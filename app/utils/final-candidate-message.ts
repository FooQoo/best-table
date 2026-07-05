import type { Store } from "~/mocks/data";
import { EMPHASIS_LABELS, getEmphasisKeys } from "~/utils/scoring";

export type FinalCandidateMessage = {
  reason: string;
  checksBeforeBooking: string[];
};

type BookingForMessage = {
  counterpart: string | null;
  priorities: string[];
};

export function buildFinalStoreMessage(
  store: Store,
  booking: BookingForMessage,
): FinalCandidateMessage {
  const emphasisLabels = getEmphasisKeys(booking.counterpart).map(
    (key) => EMPHASIS_LABELS[key],
  );

  const emphasisNote =
    emphasisLabels.length > 0
      ? `今回重視した${emphasisLabels.join("・")}の観点でも評価が高く、`
      : "";

  const reason = `${emphasisNote}${store.recommendationReason}`;

  const checksBeforeBooking: string[] = [
    ...store.concernTags,
    "空席状況は変動するため、予約前に最新の空き状況を確認してください。",
    "本画面の情報だけで予約成立を保証するものではありません。",
  ];

  return { reason, checksBeforeBooking };
}
