import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";
import { STORES } from "~/mocks/data";
import { StoreList, type StoreListScrollTarget } from "./store-list";

const store = STORES[0];

function setup(
  counterpartId: string | null,
  options: {
    activeStoreId?: string;
    onActivateStore?: (id: string) => void;
    onSelectStore?: (id: string) => void;
    stores?: typeof STORES;
    scrollTarget?: StoreListScrollTarget | null;
  } = {},
) {
  return render(
    <MemoryRouter>
      <StoreList
        stores={options.stores ?? [store]}
        compareIds={[]}
        onToggleCompare={() => {}}
        counterpartId={counterpartId}
        activeStoreId={options.activeStoreId}
        onActivateStore={options.onActivateStore}
        onSelectStore={options.onSelectStore}
        scrollTarget={options.scrollTarget}
      />
    </MemoryRouter>,
  );
}

describe("StoreList の相手種別に応じた強調表示", () => {
  it("重要顧客のとき、個室・格式・接客が強調バッジとして表示される", () => {
    setup("exec");

    expect(screen.getByTestId(`emphasis-room-${store.id}`)).toHaveTextContent(
      store.room!,
    );
    expect(
      screen.getByTestId(`emphasis-prestige-${store.id}`),
    ).toHaveTextContent(store.prestige!);
    expect(
      screen.getByTestId(`emphasis-service-${store.id}`),
    ).toHaveTextContent(store.service!);
    expect(
      screen.queryByTestId(`emphasis-quiet-${store.id}`),
    ).not.toBeInTheDocument();
  });

  it("相手種別が未選択のとき、強調バッジを表示しない", () => {
    setup(null);

    expect(
      screen.queryByTestId(`emphasis-room-${store.id}`),
    ).not.toBeInTheDocument();
  });
});

describe("StoreList の地図連動", () => {
  it("activeStoreId と一致する店舗カードを強調する", () => {
    setup(null, { activeStoreId: store.id });

    expect(screen.getByText(store.name).closest("[data-active]")).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("店舗カードに hover すると active 店舗を通知する", async () => {
    const user = userEvent.setup();
    const onActivateStore = vi.fn();
    setup(null, { onActivateStore });

    await user.hover(screen.getByText(store.name));

    expect(onActivateStore).toHaveBeenCalledWith(store.id);
  });

  it("店舗カードをクリックすると詳細表示を通知する", async () => {
    const user = userEvent.setup();
    const onSelectStore = vi.fn();
    setup(null, { onSelectStore });

    await user.click(screen.getByRole("button", { name: `${store.name}の詳細を表示` }));

    expect(onSelectStore).toHaveBeenCalledWith(store.id);
  });

  it("比較ボタンのクリックでは詳細表示を通知しない", async () => {
    const user = userEvent.setup();
    const onSelectStore = vi.fn();
    setup(null, { onSelectStore });

    await user.click(screen.getByRole("button", { name: "比較に追加" }));

    expect(onSelectStore).not.toHaveBeenCalled();
  });

  it("scrollTarget が指定されると対象の店舗カードへスクロールする（マップのピンクリック相当）", () => {
    const stores = [store, STORES[1]];
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    setup(null, { stores, scrollTarget: { storeId: STORES[1].id } });

    const targetCard = screen.getByText(STORES[1].name).closest("[data-active]");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(targetCard);
  });
});
