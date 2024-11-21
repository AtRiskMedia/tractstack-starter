import { memo, type MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { type ControlPosition } from "react-draggable";
import {
  dragHandleStore,
  dropDraggingElement,
  paneFragmentMarkdown,
  resetDragStore, setDragPosition,
  setDragShape,
  setGhostSize,
} from "@/store/storykeep.ts";
import { moveElements } from "@/utils/storykeep.ts";
import type { MarkdownLookup } from "@/types.ts";

export type MoveDraggableElementProps = {
  children?: React.ReactElement;
  skipDragNDrop: boolean;
  fragmentId : string;
  paneId: string;
  idx: number|null;
  outerIdx: number;
  markdownLookup: MarkdownLookup;
}

export const MoveDraggableElement = memo((props: MoveDraggableElementProps) => {
  const [dragPos, setDragPos] = useState<ControlPosition>({ x: 0, y: 0 });
  const dragging = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseMove: EventListener = (event) => {
      const mouseEvent = event as unknown as MouseEvent; // Type assertion to MouseEvent
      const x = mouseEvent.clientX + window.scrollX;
      const y = mouseEvent.clientY + window.scrollY;
      if (dragging.current) {
        setDragPosition({ x, y });
      }
    };

    if(!props.skipDragNDrop) {
      document.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <Draggable
      defaultPosition={{ x: dragPos.x, y: dragPos.y }}
      position={dragPos}
      onStart={() => {
        dragging.current = true;
        resetDragStore();
        const root = paneFragmentMarkdown.get()[props.fragmentId].current.markdown.htmlAst;
        setDragShape({ root, ...props });
        setGhostSize(100, 50);
      }}
      onStop={() => {
        dragging.current = false;
        if (dragHandleStore.get().affectedFragments.size > 0) {
          const dragEl = dragHandleStore.get().dragShape;
          if (dragEl) {
            const hoverEl = dragHandleStore.get().hoverElement;
            if (hoverEl) {
              moveElements(
                props.markdownLookup,
                hoverEl.markdownLookup,
                dragEl.fragmentId,
                dragEl.outerIdx,
                dragEl.paneId,
                dragEl.idx,
                hoverEl.fragmentId,
                hoverEl.outerIdx,
                hoverEl.paneId,
                hoverEl.idx,
              );
            }
          }
          dropDraggingElement();
        }
        setDragPos({ x: 0, y: 0 });
        resetDragStore();
      }}
    >
      {props.children}
    </Draggable>
  );
});