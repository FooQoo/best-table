import { fireEvent, render, screen } from "@testing-library/react";
import { StorePhoto } from "./store-photo";

describe("StorePhoto", () => {
  it("photoUrl がある場合、プロキシ経路の URL を img で表示する", () => {
    render(
      <StorePhoto
        store={{ name: "花明かり", room: "個室あり", photoUrl: "/api/photos/places/abc/photos/photo-1" }}
      />,
    );

    const img = screen.getByRole("img", { name: "花明かりの店内写真" });
    expect(img).toHaveAttribute("src", "/api/photos/places/abc/photos/photo-1");
  });

  it("photoUrl が無い場合、StorePhotoPlaceholder にフォールバックする", () => {
    render(<StorePhoto store={{ name: "花明かり", room: "個室あり", photoUrl: null }} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("個室 写真")).toBeInTheDocument();
  });

  it("画像の読み込みに失敗した場合、StorePhotoPlaceholder にフォールバックする", () => {
    render(
      <StorePhoto
        store={{ name: "花明かり", room: "カウンターのみ", photoUrl: "/api/photos/places/abc/photos/photo-1" }}
      />,
    );

    fireEvent.error(screen.getByRole("img"));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("カウンター写真")).toBeInTheDocument();
  });
});
