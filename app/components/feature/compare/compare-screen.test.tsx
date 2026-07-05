import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { BookingProvider, useBooking } from "~/state/booking-context";
import { STORES } from "~/mocks/data";
import { CompareScreen } from "./compare-screen";

function Setup({ ids }: { ids: string[] }) {
  const { toggleCompare } = useBooking();
  useEffect(() => {
    ids.forEach((id) => toggleCompare(id));
    // Setup 用の初期化なので依存配列は空でよい。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderCompareScreen(ids: string[]) {
  return render(
    <MemoryRouter>
      <BookingProvider>
        <Setup ids={ids} />
        <CompareScreen />
      </BookingProvider>
    </MemoryRouter>,
  );
}

describe("CompareScreen の境界状態", () => {
  it("0件のとき空状態を表示する", () => {
    renderCompareScreen([]);

    expect(
      screen.getByText("比較する店舗が選択されていません。"),
    ).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("1件のとき1件分の比較表を崩さず表示する", () => {
    renderCompareScreen([STORES[0].id]);

    expect(screen.getByText("1件を比較中")).toBeInTheDocument();
    expect(screen.getByText(STORES[0].name)).toBeInTheDocument();
  });

  it("上限の5件のとき5件分の比較表を崩さず表示する", () => {
    const ids = STORES.slice(0, 5).map((s) => s.id);
    renderCompareScreen(ids);

    expect(screen.getByText("5件を比較中")).toBeInTheDocument();
    for (const id of ids) {
      const store = STORES.find((s) => s.id === id);
      expect(screen.getByText(store!.name)).toBeInTheDocument();
    }
  });
});
