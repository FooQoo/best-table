import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { STORES } from "~/mocks/data";
import { buildIkyuSearchUrl } from "~/utils/ikyu-search-url";
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

  it("店舗カード以外の外側をタップ（pointerdown+pointerup）すると閉じる", () => {
    const onClose = vi.fn();
    render(
      <>
        <div>外側</div>
        <StoreDetailPanel store={STORES[0]} onClose={onClose} />
      </>,
    );

    const outside = screen.getByText("外側");
    fireEvent.pointerDown(outside, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(outside, { clientX: 100, clientY: 100 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("外側でスクロール操作（一定距離動いてから指を離す）をしても閉じない", () => {
    const onClose = vi.fn();
    render(
      <>
        <div>外側</div>
        <StoreDetailPanel store={STORES[0]} onClose={onClose} />
      </>,
    );

    const outside = screen.getByText("外側");
    fireEvent.pointerDown(outside, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(outside, { clientX: 100, clientY: 250 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("詳細パネル内でタップを開始した操作は、指を離す位置が外側になっても閉じない", () => {
    const onClose = vi.fn();
    render(
      <>
        <div>外側</div>
        <StoreDetailPanel store={STORES[0]} onClose={onClose} />
      </>,
    );

    fireEvent.pointerDown(screen.getByLabelText(`${STORES[0].name}の詳細`), {
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(screen.getByText("外側"), {
      clientX: 100,
      clientY: 100,
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("店舗名を term にした一休.comの検索URLへの送客リンクを表示する", () => {
    const store = STORES[0];
    render(<StoreDetailPanel store={store} onClose={() => {}} />);

    const link = screen.getByTestId("ikyu-referral-link");
    expect(link).toHaveTextContent("一休.comで空席を確認");
    expect(link).toHaveAttribute("href", buildIkyuSearchUrl(store));
  });
});
