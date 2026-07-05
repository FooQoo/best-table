import type { Restaurant } from "~/domain/models/restaurant";
import { GENRE_LABELS } from "~/utils/evidence-labels";

// docs/ARCHITECTURE.md「オンデマンド型（店舗詳細の質問応答）」のプロンプト組み立て。
// 回答は取得済みの店舗データ（Restaurant）にのみ基づかせ、根拠のない事実を作らせない。
export function buildStoreAskPrompt(store: Restaurant, question: string): string {
  const facts = [
    `店舗名: ${store.name}`,
    `エリア: ${store.area}`,
    `ジャンル: ${store.genre ? GENRE_LABELS[store.genre] : "情報なし"}`,
    `個室: ${store.room ?? "情報なし"}`,
    `静かさ評価: ${store.quiet ?? "情報なし"}`,
    `格式評価: ${store.prestige ?? "情報なし"}`,
    `接客評価: ${store.service ?? "情報なし"}`,
    `予算目安: ${store.budgetLabel ?? "情報なし"}`,
    `アクセス: ${store.access ?? "情報なし"}`,
    `AIによる推奨理由: ${store.matchingSummary ?? "情報なし"}`,
    `懸念点: ${
      store.concerns.length > 0
        ? store.concerns.map((c) => c.text).join("、")
        : "特になし"
    }`,
  ].join("\n");

  return [
    "あなたは接待・会食向けレストラン案内の補助アシスタントです。",
    "以下の【店舗データ】に書かれた事実のみに基づいて回答してください。書かれていない事実を作らないでください。",
    "空席状況や予約成立を断定しないでください。根拠が不足する場合は、断定せずその旨を伝えてください。",
    "回答は簡潔にしてください。",
    "",
    "【店舗データ】",
    facts,
    "",
    `【質問】${question}`,
  ].join("\n");
}
