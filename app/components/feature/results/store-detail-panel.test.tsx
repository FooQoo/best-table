import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { STORES } from "~/mocks/data";
import { StoreDetailPanel } from "./store-detail-panel";

describe("StoreDetailPanel", () => {
  it("店舗カードの pointerdown は外側クリックとして閉じない", () => {
    const onClose = vi.fn();
    render(
      <>
        <div data-store-card="true">店舗カード</div>
        <StoreDetailPanel store={STORES[0]} onClose={onClose} />
      </>,
    );

    fireEvent.pointerDown(screen.getByText("店舗カード"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("店舗カード以外の外側 pointerdown では閉じる", () => {
    const onClose = vi.fn();
    render(
      <>
        <div>外側</div>
        <StoreDetailPanel store={STORES[0]} onClose={onClose} />
      </>,
    );

    fireEvent.pointerDown(screen.getByText("外側"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ikyu を持つ店舗には一休.comの送客リンクを、マスタ由来のURLで表示する", () => {
    const ikyuStore = STORES[0];
    expect(ikyuStore.ikyu).not.toBeNull();
    render(<StoreDetailPanel store={ikyuStore} onClose={() => {}} />);

    const link = screen.getByTestId("ikyu-referral-link");
    expect(link).toHaveTextContent("一休.comで空席を確認");
    expect(link).toHaveAttribute("href", ikyuStore.ikyu!.url);
  });

  it("ikyu が null の店舗には一休.comの送客リンクを表示しない", () => {
    const nonIkyuStore = STORES.find((s) => s.ikyu === null)!;
    render(<StoreDetailPanel store={nonIkyuStore} onClose={() => {}} />);

    expect(screen.queryByTestId("ikyu-referral-link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Google Mapで空席・予約を確認" }),
    ).toBeInTheDocument();
  });
});
