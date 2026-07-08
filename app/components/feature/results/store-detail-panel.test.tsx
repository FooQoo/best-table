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

  it("詳細パネル自体をタップしても閉じず、イベントを外側へ伝播させない", () => {
    const onClose = vi.fn();
    const onOutsideClick = vi.fn();

    render(
      <div onClick={onOutsideClick}>
        <StoreDetailPanel store={STORES[0]} onClose={onClose} />
      </div>,
    );

    const panel = screen.getByLabelText(`${STORES[0].name}の詳細`);
    fireEvent.pointerDown(panel, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(panel, { clientX: 100, clientY: 100 });
    fireEvent.click(panel);

    expect(onClose).not.toHaveBeenCalled();
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("詳細パネルには一休.comとGoogle Mapの送客リンクを表示しない", () => {
    render(<StoreDetailPanel store={STORES[0]} onClose={() => {}} />);

    expect(
      screen.queryByRole("link", { name: "一休.comで空席を確認" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Google Mapで空席・予約を確認" }),
    ).not.toBeInTheDocument();
  });
});
