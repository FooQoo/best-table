import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { BookingProvider, useBooking } from "~/state/booking-context";
import { STORES } from "~/mocks/data";
import { StoreDetailScreen } from "./store-detail-screen";

function Setup() {
  const { setRestaurants } = useBooking();
  useEffect(() => {
    setRestaurants(STORES);
    // Setup 用の初期化なので依存配列は空でよい。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderAt(storeId: string) {
  return render(
    <MemoryRouter initialEntries={[`/stores/${storeId}`]}>
      <BookingProvider>
        <Setup />
        <Routes>
          <Route path="/stores/:storeId" element={<StoreDetailScreen />} />
        </Routes>
      </BookingProvider>
    </MemoryRouter>,
  );
}

describe("StoreDetailScreen", () => {
  it("店舗名・推奨理由・懸念タグ・質問応答例が常時表示される", () => {
    const store = STORES.find((s) => s.concerns.length > 0)!;
    renderAt(store.id);

    expect(screen.getByText(store.name)).toBeInTheDocument();
    expect(screen.getByText(store.matchingSummary!)).toBeInTheDocument();
    expect(
      screen.getByTestId(`concern-tags-${store.id}`),
    ).toHaveTextContent(store.concerns[0].text);
    expect(
      screen.getByText("この店は接待向きですか？", { exact: false }),
    ).toBeInTheDocument();
  });

  it("懸念タグが無い店舗でも常時表示のメッセージが存在する", () => {
    const store = STORES.find((s) => s.concerns.length === 0)!;
    renderAt(store.id);

    expect(
      screen.getByTestId(`concern-tags-${store.id}`),
    ).toHaveTextContent("懸念点は特になし");
  });

  it("空席状況を断定せず常時表示する（実予約APIには接続しない）", () => {
    const store = STORES[0];
    renderAt(store.id);

    expect(screen.getByTestId("availability-status")).toHaveTextContent(
      "確認できません",
    );
  });

  it("存在しない storeId のとき、見つからない旨と一覧へ戻る導線を表示する", () => {
    renderAt("unknown");

    expect(
      screen.getByText("店舗が見つかりませんでした。"),
    ).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });
});
