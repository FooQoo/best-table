import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMap } from "@vis.gl/react-google-maps";

type GenreMarkerOverlayProps = {
  position: { lat: number; lng: number };
  zIndex?: number;
  onClick?: () => void;
  title?: string;
  children: ReactNode;
};

// google.maps.OverlayView ベースの自前マーカー。
// vis.gl の <AdvancedMarker> はベクターマップ（mapId 指定）が前提で、mapId を
// 指定すると <Map> の styles による POI 非表示が効かなくなる（Google Maps JS API の
// 制約: 「A Map's styles property cannot be set when a mapId is present.」）。
// 既存施設の POI を隠す要件と両立させるため、ラスターマップでも動く
// OverlayView + React Portal で実装する。
export function GenreMarkerOverlay({
  position,
  zIndex,
  onClick,
  title,
  children,
}: GenreMarkerOverlayProps) {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps.OverlayView) return;

    class Overlay extends google.maps.OverlayView {
      div: HTMLDivElement | null = null;

      onAdd() {
        const div = document.createElement("div");
        div.style.position = "absolute";
        this.div = div;
        setContainer(div);
        this.getPanes()?.overlayMouseTarget.appendChild(div);
      }

      draw() {
        if (!this.div) return;
        const point = this.getProjection()?.fromLatLngToDivPixel(
          new google.maps.LatLng(position.lat, position.lng),
        );
        if (point) {
          this.div.style.left = `${point.x}px`;
          this.div.style.top = `${point.y}px`;
        }
      }

      onRemove() {
        this.div?.remove();
        this.div = null;
        setContainer(null);
      }
    }

    const overlay = new Overlay();
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, position.lat, position.lng]);

  if (!container) return null;

  return createPortal(
    <div
      title={title}
      onClick={onClick}
      style={{
        display: "inline-block",
        transform: "translate(-50%, -100%)",
        zIndex,
        cursor: onClick ? "pointer" : undefined,
        pointerEvents: "auto",
      }}
    >
      {children}
    </div>,
    container,
  );
}
