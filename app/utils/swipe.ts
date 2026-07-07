export type SwipePoint = { x: number; y: number };

export type SwipeDirection = "left" | "right";

// 横スワイプと判定する最小移動量（px）。誤操作を避けるため、ある程度の移動を要求する。
const MIN_HORIZONTAL_DISTANCE = 40;

// 縦方向の移動が横方向より大きい場合はスクロール操作とみなし、スワイプ判定しない。
export function resolveSwipeDirection(
  start: SwipePoint,
  end: SwipePoint,
): SwipeDirection | null {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  if (Math.abs(deltaX) < MIN_HORIZONTAL_DISTANCE) return null;
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return null;

  return deltaX < 0 ? "left" : "right";
}
