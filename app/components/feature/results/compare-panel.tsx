import { toPng } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { MatchTierBadge } from "~/components/ui/match-tier-badge";
import { StorePhoto } from "~/components/ui/store-photo";
import { MATCH_TIERS, type Restaurant } from "~/domain/models/restaurant";
import { GOLD, NAVY } from "~/mocks/data";
import { getTheme } from "~/styles/theme";
import { GENRE_LABELS } from "~/utils/evidence-labels";
import { buildGoogleMapsUrl } from "~/utils/google-maps-url";
import { getEmphasisKeys } from "~/utils/scoring";

type ComparePanelProps = {
  stores: Restaurant[];
  counterpartId: string | null;
  isOpen: boolean;
};

const ROWS: { label: string; key: keyof Restaurant; shaded?: boolean }[] = [
  { label: "マッチ度", key: "matchTier", shaded: true },
  { label: "個室", key: "room" },
  { label: "静かさ", key: "quiet", shaded: true },
  { label: "格式", key: "prestige" },
  { label: "接客", key: "service", shaded: true },
  { label: "アクセス", key: "access" },
  { label: "予算目安", key: "budgetLabel", shaded: true },
  { label: "懸念点", key: "concerns" },
];

// 一覧は施設検索順のまま並び替えないため（results-screen.tsx）、比較表の並び順は
// マッチ度と無関係。「おすすめ1位」バッジは配列の先頭ではなく、比較中の店舗の中で
// 最も良いマッチ度を持つ店舗を探して付ける。マッチ度が1件も無い場合は表示しない。
function findBestMatchIndex(stores: Restaurant[]): number {
  let bestIndex = -1;
  let bestRank = Number.POSITIVE_INFINITY;
  stores.forEach((store, index) => {
    if (store.matchTier === null) return;
    const rank = MATCH_TIERS.indexOf(store.matchTier);
    if (rank < bestRank) {
      bestRank = rank;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function buildCompareImageFileName(stores: Restaurant[]): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const label = stores.length > 0 ? `${stores.length}件` : "";
  return `店舗比較_${label}_${timestamp}.png`;
}

export function ComparePanel({
  stores,
  counterpartId,
  isOpen,
}: ComparePanelProps) {
  const t = getTheme();
  const emphasisKeys = getEmphasisKeys(counterpartId);
  const bestMatchIndex = findBestMatchIndex(stores);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const handleSaveImage = async () => {
    const panel = panelRef.current;
    if (!panel || isSaving) return;

    setIsSaving(true);
    setSaveFailed(false);

    // 比較表は縦スクロールで一部が隠れうるため、非表示のクローンで
    // スクロール制約を外した全体をキャプチャしてからダウンロードする。
    // スクロール領域は Tailwind の flex-1（flex-basis: 0%）のままだと
    // 高さ・幅を明示しない限り実サイズを持たないため、元要素の
    // scrollWidth/scrollHeight をピクセル値として明示的に与える。
    //
    // html-to-image は渡したノードの computed style をそのまま複製して
    // SVG の foreignObject 内に描画するため、クローン自身に
    // position: fixed / 大きなオフセットを付けると、その位置指定ごと
    // foreignObject 内に複製されてしまい、描画内容が可視領域の外側に
    // ずれて空の画像になる。そのためクローン自身は static のままにし、
    // 画面外に置く役目は別のラッパー要素だけに持たせる。
    let wrapper: HTMLElement | null = null;
    try {
      const originalScrollArea = panel.querySelector<HTMLElement>(
        "[data-compare-scroll-area]",
      );
      const fullWidth = originalScrollArea?.scrollWidth ?? panel.offsetWidth;
      const fullHeight =
        originalScrollArea?.scrollHeight ?? panel.offsetHeight;

      const clone = panel.cloneNode(true) as HTMLElement;
      clone.style.position = "static";
      clone.style.transform = "none";
      clone.style.width = `${panel.offsetWidth}px`;
      clone.style.height = "auto";
      clone.style.overflow = "visible";
      for (const excluded of clone.querySelectorAll<HTMLElement>(
        "[data-compare-export-exclude]",
      )) {
        excluded.remove();
      }
      const scrollArea = clone.querySelector<HTMLElement>(
        "[data-compare-scroll-area]",
      );
      if (scrollArea) {
        scrollArea.style.flex = "none";
        scrollArea.style.overflow = "visible";
        scrollArea.style.width = `${fullWidth}px`;
        scrollArea.style.height = `${fullHeight}px`;
      }

      wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "-99999px";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const dataUrl = await toPng(clone, {
        backgroundColor: "#fffdf8",
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = buildCompareImageFileName(stores);
      link.click();
    } catch (error) {
      console.error("比較表の画像生成に失敗しました", error);
      setSaveFailed(true);
    } finally {
      wrapper?.remove();
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={panelRef}
      aria-label="比較"
      data-open={isOpen ? "true" : "false"}
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#fffdf8] shadow-[-10px_0_24px_rgba(20,20,20,.16)] transition-transform duration-300 data-[open=false]:pointer-events-none data-[open=false]:translate-x-[calc(100%+32px)] data-[open=true]:translate-x-0"
    >
      <div className="flex-none border-b border-[#e4ded0] px-5 py-4 flex items-center justify-between gap-3">
        <h2 className="m-0 font-serif text-lg font-bold text-[#20201c]">
          {stores.length}件を比較中
        </h2>
        {stores.length > 0 && (
          <div
            data-compare-export-exclude
            className="flex flex-none items-center gap-2"
          >
            {saveFailed && (
              <span className="text-xs font-bold text-[#b3432b]">
                画像の保存に失敗しました
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={isSaving}
              className="flex flex-none items-center gap-1.5 rounded-full border border-[#ddd4c2] bg-white px-3 py-1.5 text-xs font-bold text-[#4a463f] transition-colors hover:bg-[#f7f4ee] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="比較表を画像として保存"
              title="比較表を画像として保存"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-3.5" aria-hidden="true" />
              )}
              画像として保存
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-5" data-compare-scroll-area>
        {stores.length === 0 ? (
          <div className="grid h-full place-items-center text-sm font-bold text-[#79726a]">
            店舗が選択されていません
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: `160px repeat(${stores.length}, minmax(150px, 1fr))`,
            }}
          >
            <div
              className="p-4"
              style={{ borderBottom: `2px solid ${NAVY}` }}
            />
            {stores.map((store, i) => (
              <div
                key={store.id}
                className="p-4 border-l border-[#e4ded0] flex flex-col gap-2"
                style={{
                  borderBottom: `2px solid ${NAVY}`,
                  background: i === bestMatchIndex ? t.accentSoftBg : "#fff",
                }}
              >
                <div
                  className="self-start font-bold text-[11px] px-2.5 py-0.5 rounded-full"
                  style={
                    i === bestMatchIndex
                      ? { background: GOLD, color: "#20201c" }
                      : { visibility: "hidden" }
                  }
                >
                  おすすめ 1位
                </div>
                <div className="flex w-full justify-center">
                  <StorePhoto store={store} className="w-full h-20 max-w-40" />
                </div>
                <div className="font-bold text-sm">{store.name}</div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#79726a]">
                  <span>
                    {store.genre
                      ? GENRE_LABELS[store.genre]
                      : "ジャンル情報なし"}
                  </span>
                  <a
                    href={buildGoogleMapsUrl(store)}
                    target="_blank"
                    rel="noopener"
                    className="flex-none text-[#8a6a1f] underline underline-offset-2"
                  >
                    Google Mapで空席・予約を確認
                  </a>
                </div>
                {store.ikyu && (
                  <a
                    href={store.ikyu.url}
                    target="_blank"
                    rel="noopener"
                    data-testid={`compare-ikyu-referral-${store.id}`}
                    className="self-start text-[11px] font-bold text-[#8a6a1f] underline underline-offset-2"
                  >
                    一休.comで空席を確認
                  </a>
                )}
              </div>
            ))}

            {ROWS.map((row) => {
              const emphasized = (emphasisKeys as string[]).includes(row.key);
              return (
                <Fragment key={row.label}>
                  <div
                    data-emphasized={emphasized}
                    className={`p-3.5 font-bold text-[13px] border-b border-[#eee] ${row.shaded ? "bg-[#faf8f3]" : ""}`}
                    style={emphasized ? { color: "#8a6a1a" } : undefined}
                  >
                    {row.label}
                    {emphasized && (
                      <span
                        className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: GOLD, color: "#20201c" }}
                      >
                        重視
                      </span>
                    )}
                  </div>
                  {stores.map((store) => (
                    <div
                      key={`${row.label}-${store.id}`}
                      className="p-3.5 text-center border-b border-[#eee] border-l border-[#e4ded0] text-[13px]"
                      style={{
                        ...(row.key === "concerns"
                          ? {
                              color:
                                store.concerns.length === 0
                                  ? "#79726a"
                                  : "#9a6a2a",
                            }
                          : undefined),
                        ...(emphasized
                          ? { background: t.accentSoftBg }
                          : undefined),
                      }}
                    >
                      {row.key === "matchTier" ? (
                        <MatchTierBadge tier={store.matchTier} showLabel={false} />
                      ) : row.key === "concerns" ? (
                        store.concerns.length > 0 ? (
                          store.concerns.map((c) => c.text).join(" / ")
                        ) : (
                          "特になし"
                        )
                      ) : (
                        (store[row.key] ?? "情報なし").toString()
                      )}
                    </div>
                  ))}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
