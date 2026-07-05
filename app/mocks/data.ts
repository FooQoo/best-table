import type { Restaurant } from "~/domain/models/restaurant";

export const NAVY = "#12202f";
export const GOLD = "#c8a24a";

export const INK = "#20201c";
export const BORDER = "#d8d2c0";
export const MUTED_BORDER = "#e4ded0";

export type Counterpart = {
  id: string;
  label: string;
  desc: string;
};

export const COUNTERPARTS: Counterpart[] = [
  { id: "exec", label: "重要顧客・役員クラスの接待", desc: "個室・接客・格式を外したくない" },
  { id: "partner", label: "初回の取引先・商談前後", desc: "堅すぎず、会話しやすい雰囲気にしたい" },
  { id: "boss", label: "社内上司・幹部との会食", desc: "予算感と落ち着きを両立したい" },
  { id: "thanks", label: "お礼・懇親の食事", desc: "感謝が伝わる、少し特別な店にしたい" },
  { id: "bond", label: "関係を深めたい相手との会食", desc: "肩肘張らず、印象に残る食事にしたい" },
];

export const BUDGET_STEPS = ["指定なし", "¥5,000", "¥10,000", "¥15,000", "¥20,000", "¥30,000", "¥50,000"];

export type Priority = {
  key: string;
  label: string;
  desc: string;
};

export const PRIORITIES: Priority[] = [
  { key: "calm", label: "落ち着いて話せる", desc: "周囲の音や席間隔を重視します" },
  { key: "room", label: "個室・半個室を優先", desc: "商談や相談がしやすい席を優先します" },
  { key: "prestige", label: "失礼のない格式感", desc: "相手の役職や関係性に合う雰囲気を重視します" },
  { key: "service", label: "接客の安定感", desc: "口コミ上のサービス評価を重視します" },
  { key: "access", label: "駅から迷わず行ける", desc: "初めての相手でも到着しやすい店を優先します" },
  { key: "budget", label: "予算内に収めたい", desc: "想定単価から大きく外れない店を優先します" },
];

export type Prefecture = {
  name: string;
  cities: string[];
};

export type AreaRegion = {
  region: string;
  prefectures: Prefecture[];
};

export const AREA_REGIONS: AreaRegion[] = [
  {
    region: "関東",
    prefectures: [
      { name: "東京都", cities: ["銀座", "六本木", "赤坂・虎ノ門", "丸の内・大手町", "新橋"] },
      { name: "神奈川県", cities: ["横浜", "川崎"] },
    ],
  },
  {
    region: "東北",
    prefectures: [{ name: "宮城県", cities: ["仙台"] }],
  },
  {
    region: "甲信越・北陸",
    prefectures: [
      { name: "新潟県", cities: ["新潟市"] },
      { name: "長野県", cities: ["松本"] },
      { name: "石川県", cities: ["金沢"] },
    ],
  },
  {
    region: "東海",
    prefectures: [
      { name: "愛知県", cities: ["名古屋"] },
      { name: "静岡県", cities: ["静岡市"] },
    ],
  },
  {
    region: "関西",
    prefectures: [
      { name: "大阪府", cities: ["梅田", "難波"] },
      { name: "京都府", cities: ["京都市"] },
      { name: "兵庫県", cities: ["神戸"] },
    ],
  },
];

export type HistoryItem = {
  title: string;
  date: string;
};

export const HISTORY: HistoryItem[] = [
  { title: "銀座・取引先接待", date: "7/2" },
  { title: "六本木・社内懇親会", date: "6/28" },
  { title: "赤坂・お礼の会食", date: "6/20" },
];

// app/mocks/ 専用の拡張。`Restaurant`（docs/MODEL.md 準拠のドメイン型）に、実データ未接続な間だけ
// 使うプロトタイプ表示用フィールド（相対位置の MAP マーカー座標・写真プレースホルダーラベル）を足したもの。
// `location` / `photoUrl` は実接続（UoW-7）まで null のままにし、架空の値で埋め合わせない。
export type Store = Restaurant & {
  pos: { top: string; left: string };
  photoPlaceholderLabel: string;
};

export const STORES: Store[] = [
  { id: "s1", placeId: null, name: "日本料理 花明かり", genre: "会席・日本料理", area: "銀座", address: null, location: null, phone: "03-1234-5601", photoUrl: null, score: 94, room: "個室あり", quiet: "◎", prestige: "◎", service: "◎", access: "銀座駅 徒歩3分", budgetLabel: "¥30,000", concerns: [], matchingSummary: "完全個室と口コミ評価の高さが揃っており、重要顧客との会食でも格式面の不安が少ない。写真からも落ち着いた内装がうかがえる。", evidence: ["review", "photo", "description"], confidence: "high", generatedAt: "2026-07-04T09:00:00.000Z", photoPlaceholderLabel: "個室 写真", pos: { top: "20%", left: "32%" } },
  { id: "s2", placeId: null, name: "鉄板焼 円", genre: "鉄板焼", area: "六本木", address: null, location: null, phone: "03-1234-5602", photoUrl: null, score: 85, room: "半個室あり", quiet: "○", prestige: "○", service: "◎", access: "六本木駅 徒歩5分", budgetLabel: "¥20,000", concerns: [{ text: "カウンター越しの接客になる場合がある", evidence: ["seat"] }], matchingSummary: "口コミでは接客の評価が特に高い。半個室のため完全な個室ではなく、着席位置によってはカウンター越しの接客になる点は事前に共有しておきたい。", evidence: ["review", "seat"], confidence: "high", generatedAt: "2026-07-04T09:00:00.000Z", photoPlaceholderLabel: "カウンター写真", pos: { top: "48%", left: "60%" } },
  { id: "s3", placeId: null, name: "鮨 一凛", genre: "鮨", area: "新橋", address: null, location: null, phone: "03-1234-5603", photoUrl: null, score: 78, room: "カウンターのみ", quiet: "○", prestige: "○", service: "○", access: "新橋駅 徒歩2分", budgetLabel: "¥15,000", concerns: [{ text: "個室がなく会話距離が近い", evidence: ["seat"] }], matchingSummary: "駅からのアクセスが良く、少人数の会食向き。個室はなくカウンター中心のため、商談の込み入った話には向かない可能性がある。", evidence: ["review", "access"], confidence: "medium", generatedAt: "2026-07-04T09:00:00.000Z", photoPlaceholderLabel: "カウンター写真", pos: { top: "66%", left: "20%" } },
  { id: "s4", placeId: null, name: "京料理 和心", genre: "京料理", area: "丸の内", address: null, location: null, phone: "03-1234-5604", photoUrl: null, score: 90, room: "個室あり", quiet: "◎", prestige: "◎", service: "○", access: "東京駅 徒歩4分", budgetLabel: "¥30,000", concerns: [], matchingSummary: "個室ありで静かさ・格式感の評価も高く、役員クラスの会食に適した候補。接客面の口コミはやや分かれており、当日の混雑状況によって差が出る可能性がある。", evidence: ["review", "photo"], confidence: "high", generatedAt: "2026-07-04T09:00:00.000Z", photoPlaceholderLabel: "個室 写真", pos: { top: "28%", left: "76%" } },
  { id: "s5", placeId: null, name: "創作和食 灯", genre: "創作和食", area: "赤坂", address: null, location: null, phone: "03-1234-5605", photoUrl: null, score: 66, room: "半個室あり", quiet: "△", prestige: "○", service: "○", access: "赤坂駅 徒歩6分", budgetLabel: "¥15,000", concerns: [{ text: "口コミに「賑やか」との声がある", evidence: ["review"] }], matchingSummary: "料理やコース内容への口コミ評価は高い一方、時間帯によっては賑やかになるとの声があり、静かに話したい会食には向き不向きがある。", evidence: ["review"], confidence: "medium", generatedAt: "2026-07-04T09:00:00.000Z", photoPlaceholderLabel: "店内写真", pos: { top: "58%", left: "40%" } },
  { id: "s6", placeId: null, name: "炭火焼 楽", genre: "焼鳥・炭火焼", area: "虎ノ門", address: null, location: null, phone: "03-1234-5606", photoUrl: null, score: 72, room: "半個室あり", quiet: "○", prestige: "△", service: "○", access: "虎ノ門駅 徒歩3分", budgetLabel: "¥10,000", concerns: [{ text: "煙や匂いが気になる場合がある", evidence: ["review", "description"] }], matchingSummary: "アクセスが良く半個室で会話はしやすいが、焼き物中心のため煙や匂いが気になるとの口コミがあり、スーツでの利用時は事前案内が安心。", evidence: ["review", "description"], confidence: "medium", generatedAt: "2026-07-04T09:00:00.000Z", photoPlaceholderLabel: "店内写真", pos: { top: "78%", left: "66%" } },
];

export const MAP_RENDERING_MOCK_RESTAURANTS: Restaurant[] = STORES.map(
  (store, index) => {
    const locations = [
      { lat: 35.672176, lng: 139.765022 },
      { lat: 35.661991, lng: 139.730278 },
      { lat: 35.666195, lng: 139.758587 },
      { lat: 35.681382, lng: 139.767209 },
      { lat: 35.674511, lng: 139.736125 },
      { lat: 35.668119, lng: 139.749591 },
    ];

    return {
      ...store,
      location: locations[index] ?? null,
      placeId: `mock-place-${index + 1}`,
    };
  },
);

export function shade(hex: string, pct: number): string {
  const clean = hex.replace("#", "");
  let r = parseInt(clean.substring(0, 2), 16);
  let g = parseInt(clean.substring(2, 4), 16);
  let b = parseInt(clean.substring(4, 6), 16);
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + (pct < 0 ? (c * pct) / 100 : ((255 - c) * pct) / 100))));
  r = adj(r);
  g = adj(g);
  b = adj(b);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.substring(0, 2), 16), parseInt(clean.substring(2, 4), 16), parseInt(clean.substring(4, 6), 16)];
}
