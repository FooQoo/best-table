import { render, screen } from "@testing-library/react";
import { STORES } from "~/mocks/data";
import { ComparePanel } from "./compare-panel";

const stores = STORES.slice(0, 2);

function setup(counterpartId: string | null) {
  return render(<ComparePanel stores={stores} counterpartId={counterpartId} />);
}

describe("ComparePanel の相手種別に応じた強調表示", () => {
  it("重要顧客のとき、個室・格式・接客の行ラベルが強調される", () => {
    setup("exec");

    expect(screen.getByText("個室").getAttribute("data-emphasized")).toBe(
      "true",
    );
    expect(screen.getByText("格式").getAttribute("data-emphasized")).toBe(
      "true",
    );
    expect(screen.getByText("接客").getAttribute("data-emphasized")).toBe(
      "true",
    );
    expect(screen.getByText("静かさ").getAttribute("data-emphasized")).toBe(
      "false",
    );
  });

  it("相手種別が未選択のとき、どの行も強調されない", () => {
    setup(null);

    expect(screen.getByText("個室").getAttribute("data-emphasized")).toBe(
      "false",
    );
  });
});

describe("ComparePanel の境界状態", () => {
  it("1件のとき1件分の比較表を崩さず表示する", () => {
    render(<ComparePanel stores={STORES.slice(0, 1)} counterpartId={null} />);

    expect(screen.getByText("1件を比較中")).toBeInTheDocument();
    expect(screen.getByText(STORES[0].name)).toBeInTheDocument();
  });

  it("上限の5件のとき5件分の比較表を崩さず表示する", () => {
    const fiveStores = STORES.slice(0, 5);
    render(<ComparePanel stores={fiveStores} counterpartId={null} />);

    expect(screen.getByText("5件を比較中")).toBeInTheDocument();
    for (const store of fiveStores) {
      expect(screen.getByText(store.name)).toBeInTheDocument();
    }
  });

  it("この店に決めるボタンや最終候補パネルは表示されない", () => {
    setup(null);

    expect(screen.queryByText("この店に決める")).not.toBeInTheDocument();
    expect(
      screen.queryByText("この店舗を選んだ理由"),
    ).not.toBeInTheDocument();
  });
});
