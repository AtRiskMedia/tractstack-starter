import { dragHandleStore, dragStartTime, lastDragTime, Location } from "@/store/storykeep.ts";

export function canDrawGhostBlock(
  fragmentId: string,
  paneId: string,
  idx: number | null,
  outerIdx: number,
  ignoreDragNDrop: boolean
) {
  if (lastDragTime.get() === dragStartTime.get())
    return false;

  const el = dragHandleStore.get().hoverElement;
  if (!el || ignoreDragNDrop) {
    return false;
  }

  return (
    el.fragmentId === fragmentId &&
    el.paneId === paneId &&
    el.idx === idx &&
    el.outerIdx === outerIdx
  );
}

export function getRelativeYLocationToElement(dragPosY: number, elRect: DOMRect) {
  const loc = dragPosY > elRect.y + window.scrollY + elRect.height / 2 ? Location.AFTER : Location.BEFORE;
  return loc;
}