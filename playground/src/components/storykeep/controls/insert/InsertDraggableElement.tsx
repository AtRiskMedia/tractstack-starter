import { memo, type MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { type ControlPosition } from "react-draggable";
import {
  dragHandleStore,
  dropDraggingElement,
  resetDragStore,
  setDragPosition,
  setGhostBlockHeight,
} from "@/store/storykeep.ts";
import type { ToolAddMode } from "@/types.ts";
import { toolAddModeDefaultHeight, toolAddModesSizes } from "@/constants.ts";

export type DraggableElementProps = {
  children?: React.ReactElement;
  el?: ToolAddMode;
  onClicked?: (mode: ToolAddMode) => void;
};

export const InsertDraggableElement = memo((props: DraggableElementProps) => {
  const [dragPos, setDragPos] = useState<ControlPosition>({ x: 0, y: 0 });
  const dragging = useRef<boolean>(false);
  const domRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (props.onClicked && props.el) {
      props.onClicked(props.el);
    }
  };

  useEffect(() => {
    const handleMouseMove: EventListener = (event) => {
      const mouseEvent = event as unknown as MouseEvent;
      const x = mouseEvent.clientX + window.scrollX;
      const y = mouseEvent.clientY + window.scrollY;
      if (dragging.current) {
        setDragPosition({ x, y });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      // reset drag here again because some modes can not trigger draggable onStop
      resetDragStore();
    };
  }, []);

  return (
    <Draggable
      nodeRef={domRef as unknown as React.RefObject<HTMLElement>}
      defaultPosition={{ x: dragPos.x, y: dragPos.y }}
      position={dragPos}
      onMouseDown={handleClick}
      onStart={() => {
        dragging.current = true;
        resetDragStore();

        let height = toolAddModeDefaultHeight;
        if (props.el) {
          const addModeHeight = toolAddModesSizes[props.el];
          if (addModeHeight > 0) {
            height = addModeHeight;
          }
        }
        setGhostBlockHeight(height);
      }}
      onStop={() => {
        dragging.current = false;
        if (dragHandleStore.get().affectedFragments.size === 0) {
          resetDragStore();
        } else {
          dropDraggingElement();
        }
        setDragPos({ x: 0, y: 0 });
      }}
    >
      <div ref={domRef}>{props.children}</div>
    </Draggable>
  );
});
