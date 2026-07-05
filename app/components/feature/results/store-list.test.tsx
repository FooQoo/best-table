import { render, screen } from "@testing-library/react";
import { STORES } from "~/mocks/data";
import { StoreList } from "./store-list";

const store = STORES[0];

function setup(counterpartId: string | null) {
  return render(
    <StoreList
      stores={[store]}
      compareIds={[]}
      onToggleCompare={() => {}}
      counterpartId={counterpartId}
    />,
  );
}

describe("StoreList の相手種別に応じた強調表示", () => {
  it("重要顧客のとき、個室・格式・接客が強調バッジとして表示される", () => {
    setup("exec");

    expect(screen.getByTestId(`emphasis-room-${store.id}`)).toHaveTextContent(
      store.room,
    );
    expect(
      screen.getByTestId(`emphasis-prestige-${store.id}`),
    ).toHaveTextContent(store.prestige);
    expect(
      screen.getByTestId(`emphasis-service-${store.id}`),
    ).toHaveTextContent(store.service);
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
