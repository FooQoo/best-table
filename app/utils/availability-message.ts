// docs/MODEL.md: 空席・予約成立を断定しない。実予約 API を呼ばず、外部予約導線または
// 予約前確認への受け渡しに留める（実装対象外）。そのため空席状況は常にこの留保表現を返し、
// 店舗ごとのデータや条件によって断定的な表現に変えることはしない。
export const AVAILABILITY_UNKNOWN_MESSAGE =
  "空席状況は確認できません。予約前に店舗へ直接お問い合わせください。";

export function getAvailabilityMessage(): string {
  return AVAILABILITY_UNKNOWN_MESSAGE;
}
