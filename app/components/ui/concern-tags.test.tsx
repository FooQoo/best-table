import { render, screen } from "@testing-library/react";
import { ConcernTags } from "./concern-tags";

describe("ConcernTags", () => {
  it("懸念タグがある場合、ホバー操作なしで DOM 上に常時表示される", () => {
    render(
      <ConcernTags
        storeId="s1"
        concerns={[
          { text: "懸念A", evidence: ["description"] },
          { text: "懸念B", evidence: ["seat"] },
        ]}
      />,
    );

    const el = screen.getByTestId("concern-tags-s1");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("懸念A");
    expect(el).toHaveTextContent("懸念B");
  });

  it("懸念タグには根拠カテゴリが常時表示される", () => {
    render(
      <ConcernTags
        storeId="s1"
        concerns={[{ text: "懸念A", evidence: ["description", "seat"] }]}
      />,
    );

    const el = screen.getByTestId("concern-tags-s1");
    expect(el).toHaveTextContent("店舗紹介文");
    expect(el).toHaveTextContent("席");
  });

  it("懸念タグがない場合も、常時表示のメッセージが DOM 上に存在する", () => {
    render(<ConcernTags storeId="s4" concerns={[]} />);

    expect(screen.getByTestId("concern-tags-s4")).toHaveTextContent(
      "懸念点は特になし",
    );
  });
});
