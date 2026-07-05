import { render, screen } from "@testing-library/react";
import { ConcernTags } from "./concern-tags";

describe("ConcernTags", () => {
  it("懸念タグがある場合、ホバー操作なしで DOM 上に常時表示される", () => {
    render(<ConcernTags storeId="s1" tags={["懸念A", "懸念B"]} />);

    const el = screen.getByTestId("concern-tags-s1");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("懸念A");
    expect(el).toHaveTextContent("懸念B");
  });

  it("懸念タグがない場合も、常時表示のメッセージが DOM 上に存在する", () => {
    render(<ConcernTags storeId="s4" tags={[]} />);

    expect(screen.getByTestId("concern-tags-s4")).toHaveTextContent(
      "懸念点は特になし",
    );
  });
});
