import { memo, type MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { type ControlPosition } from "react-draggable";
import {
  dragHandleStore,
  dropDraggingElement,
  resetDragStore,
  setDragPosition,
  setGhostSize,
} from "@/store/storykeep.ts";
import type { ToolAddMode } from "@/types.ts";

export type DraggableElementProps = {
  children?: React.ReactElement;
  el?: ToolAddMode;
  onClicked?: (mode: ToolAddMode) => void;
};

export const DraggableElement = memo((props: DraggableElementProps) => {
  const [dragPos, setDragPos] = useState<ControlPosition>({ x: 0, y: 0 });
  const dragging = useRef<boolean>(false);

  const handleClick = () => {
    if (props.onClicked && props.el) {
      props.onClicked(props.el);
    }
  };

  useEffect(() => {
    const handleMouseMove: EventListener = (event) => {
      const mouseEvent = event as unknown as MouseEvent; // Type assertion to MouseEvent
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
      defaultPosition={{ x: dragPos.x, y: dragPos.y }}
      position={dragPos}
      onMouseDown={handleClick}
      onStart={() => {
        dragging.current = true;
        resetDragStore();
        setGhostSize(100, 50);
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
      {props.children}
    </Draggable>
  );
});
