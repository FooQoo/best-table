import type { Store } from "~/mocks/data";

export type StoreQAItem = {
  question: string;
  answer: string;
};

export function buildStoreQA(store: Store): StoreQAItem[] {
  const concernNote =
    store.concernTags.length > 0
      ? `一方、口コミからは${store.concernTags.join("、")}との声もあり、事前に共有しておくと安心です。`
      : "口コミの範囲では特に大きな懸念は見当たりません。";

  return [
    {
      question: "この店は接待向きですか？",
      answer: `店舗紹介文と口コミからは、${store.room}で接客評価も${store.service}となっており、接待に使いやすい候補です。${concernNote}最終判断は最新の口コミもあわせてご確認ください。`,
    },
    {
      question: "個室はどの程度期待できますか？",
      answer: `店舗情報上の記載は「${store.room}」です。実際の個室度合いは予約時の座席指定や当日の混雑状況で変わることがあるため、予約時に個室希望を伝えることをおすすめします。`,
    },
    {
      question: "騒がしすぎる懸念はありますか？",
      answer:
        store.quiet === "◎"
          ? "口コミ上の静かさの評価は高めです。ただし時間帯や曜日によって印象が変わる可能性はあるため、断定はできません。"
          : `静かさの評価は「${store.quiet}」です。${concernNote}`,
    },
    {
      question: "役員クラスとの会食に失礼はありませんか？",
      answer: `格式感の評価は「${store.prestige}」です。写真・口コミの範囲では役員クラスの会食にも対応しやすい雰囲気ですが、当日の空席状況までは保証できません。`,
    },
    {
      question: "初対面の取引先には堅すぎませんか？",
      answer: `${store.genre}の店で、口コミ上の雰囲気は${store.prestige === "◎" ? "やや格式高め" : "程よい落ち着き"}です。初対面の相手との距離感が気になる場合は、事前に個室の可否を確認すると安心です。`,
    },
  ];
}
