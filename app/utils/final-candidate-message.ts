import type { Restaurant } from "~/domain/models/restaurant";
import { getAvailabilityMessage } from "~/utils/availability-message";
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
  store: Restaurant,
  booking: BookingForMessage,
): FinalCandidateMessage {
  const emphasisLabels = getEmphasisKeys(booking.counterpart).map(
    (key) => EMPHASIS_LABELS[key],
  );

  const emphasisNote =
    emphasisLabels.length > 0
      ? `今回重視した${emphasisLabels.join("・")}の観点でも評価が高く、`
      : "";

  const reason = `${emphasisNote}${store.matchingSummary ?? ""}`;

  const checksBeforeBooking: string[] = [
    ...store.concerns.map((concern) => concern.text),
    getAvailabilityMessage(),
    "本画面の情報だけで予約成立を保証するものではありません。",
  ];

  return { reason, checksBeforeBooking };
}
