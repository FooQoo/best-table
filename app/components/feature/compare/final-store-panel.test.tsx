import { render, screen } from "@testing-library/react";
import type { Restaurant } from "~/domain/models/restaurant";
import { FinalStorePanel } from "./final-store-panel";

const store: Restaurant = {
  id: "r1",
  placeId: "places/ChIJ123",
  name: "日本料理 花明かり",
  genre: "会席・日本料理",
  area: "銀座",
  address: "東京都中央区銀座4-6-16",
  location: { lat: 35.672176, lng: 139.765022 },
  phone: "03-1234-5601",
  photoUrl: null,
  score: 94,
  room: "個室あり",
  quiet: "◎",
  prestige: "◎",
  service: "◎",
  access: "銀座駅 徒歩3分",
  budgetLabel: "¥30,000",
  concerns: [],
  matchingSummary: "完全個室と口コミ評価の高さが揃っています。",
  evidence: ["review"],
  confidence: "high",
  generatedAt: "2026-07-04T09:00:00.000Z",
};

function setup(targetStore: Restaurant = store) {
  return render(
    <FinalStorePanel
      store={targetStore}
      counterpartId="exec"
      priorities={["room"]}
    />,
  );
}

describe("FinalStorePanel", () => {
  it("shows a final-store map area when the selected store has coordinates", () => {
    setup();

    expect(screen.getByText("最終候補の地図")).toBeInTheDocument();
    expect(screen.queryByText("地図情報なし")).not.toBeInTheDocument();
  });

  it("shows no fake marker location when coordinates are missing", () => {
    setup({ ...store, location: null });

    expect(screen.getAllByText("地図情報なし").length).toBeGreaterThan(0);
    expect(screen.queryByText("最終候補の地図")).not.toBeInTheDocument();
  });

  it("links to Google Map using place_id and keeps the main decision text visible", () => {
    setup();

    const link = screen.getByRole("link", { name: "Google Mapで開く" });
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/place/?q=place_id:ChIJ123",
    );
    expect(screen.getByText("この店舗を選んだ理由")).toBeInTheDocument();
    expect(screen.getByText("予約前の確認事項")).toBeInTheDocument();
    expect(screen.getByText("連絡先")).toBeInTheDocument();
    expect(screen.getByText("アクセス")).toBeInTheDocument();
  });
});
