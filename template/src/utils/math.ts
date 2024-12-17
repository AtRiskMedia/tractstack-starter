import type { ControlPosition } from "react-draggable";

export const isNonZeroMagnitude = (pos: ControlPosition) => pos.x > 0 && pos.y > 0;

export const isPosInsideRect = (rect: DOMRect, pos: ControlPosition) =>
  isInsideRect(rect, pos.x, pos.y);

export const isInsideRect = (rect: DOMRect, x: number, y: number) => {
  return (
    x >= rect.left + window.scrollX &&
    x <= rect.right + window.scrollX &&
    y >= rect.top + window.scrollY &&
    y <= rect.bottom + window.scrollY
  );
};
