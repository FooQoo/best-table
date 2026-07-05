import { render, screen } from "@testing-library/react";
import { STORES } from "~/mocks/data";
import { CompareTable } from "./compare-table";

const stores = STORES.slice(0, 2);

function setup(counterpartId: string | null) {
  return render(
    <CompareTable
      stores={stores}
      finalStoreId={null}
      onSelectFinalStore={() => {}}
      counterpartId={counterpartId}
    />,
  );
}

describe("CompareTable の相手種別に応じた強調表示", () => {
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
