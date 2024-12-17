import { memo, type MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { type ControlPosition } from "react-draggable";
import {
  dragHandleStore, dropDraggingElement,
  Location,
  resetDragStore,
  setDragPane,
  setDragPosition,
  setGhostBlockHeight,
} from "@/store/storykeep.ts";
import { useStore } from "@nanostores/react";
import { GhostBlock } from "@/components/storykeep/GhostBlock.tsx";
import { toolAddModeDefaultHeight } from "@/constants.ts";

export type MoveDraggablePaneProps = {
  children?: React.ReactElement;
  paneId: string;
  ignoreDragNDrop: boolean;
}

export const MoveDraggablePane = memo((props: MoveDraggablePaneProps) => {
  const [dragPos, setDragPos] = useState<ControlPosition>({ x: 0, y: 0 });
  const domRef = useRef(null);
  const dragging = useRef<boolean>(false);
  const activeHoverArea = useRef<Location>(Location.NOWHERE);
  const dragState = useStore(dragHandleStore);

  let allowTag = { before: true, after: true };
  if(dragState.dragPane) {

  }

  useEffect(() => {
    const handleMouseMove: EventListener = (event) => {
      const mouseEvent = event as unknown as MouseEvent; // Type assertion to MouseEvent
      const x = mouseEvent.clientX + window.scrollX;
      const y = mouseEvent.clientY + window.scrollY;
      if (dragging.current) {
        // set timeout 0ms pushes this to the next event frame process
        setTimeout(() => setDragPosition({ x, y }), 0);
      }
    };

    if (!props.ignoreDragNDrop) {
      document.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const canDrawGhost = false;

  return (
    <div className="inline">
      {canDrawGhost && dragState.hoverElement?.location === "before" && <GhostBlock />}
      <Draggable
        handle=".pane-drag-button"
        nodeRef={domRef}
        defaultPosition={{ x: dragPos.x, y: dragPos.y }}
        position={dragPos}
        onStart={() => {
          dragging.current = true;
          resetDragStore();
          setDragPane({paneId: props.paneId});
          setGhostBlockHeight(toolAddModeDefaultHeight);
        }}
        onStop={() => {
          dragging.current = false;
          if (dragHandleStore.get().affectedFragments.size > 0) {
            const dragEl = dragHandleStore.get().dragShape;
            if (dragEl) {
              const hoverEl = dragHandleStore.get().hoverElement;
              if (hoverEl && hoverEl.location !== "none") {

              }
            }
            dropDraggingElement();
          }
          setDragPos({ x: 0, y: 0 });
          resetDragStore();
        }}
      >
        <div ref={domRef}>{props.children}</div>
      </Draggable>
      {canDrawGhost && dragState.hoverElement?.location === "after" && <GhostBlock />}
    </div>
  );
});