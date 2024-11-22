import { memo, type MouseEvent, type RefObject, useEffect, useRef, useState } from "react";
import Draggable, { type ControlPosition } from "react-draggable";
import {
  dragHandleStore, type DragNode, dragStartTime,
  dropDraggingElement, lastDragTime, Location,
  paneFragmentMarkdown,
  resetDragStore, setDragHoverInfo, setDragPosition,
  setDragShape,
  setGhostSize,
} from "@/store/storykeep.ts";
import { moveElements } from "@/utils/storykeep.ts";
import type { MarkdownLookup } from "@/types.ts";
import { isPosInsideRect } from "@/utils/math.ts";
import { useStore } from "@nanostores/react";
import { getFinalLocation } from "@/utils/helpers.ts";
import { allowTagInsert } from "@/utils/compositor/markdownUtils.ts";

export type MoveDraggableElementProps = {
  children?: React.ReactElement;
  ignoreDragNDrop: boolean;
  fragmentId : string;
  paneId: string;
  idx: number|null;
  id: string;
  outerIdx: number;
  markdownLookup: MarkdownLookup;
  self?: RefObject<HTMLDivElement>|null;
}

export const MoveDraggableElement = memo((props: MoveDraggableElementProps) => {
  const [dragPos, setDragPos] = useState<ControlPosition>({ x: 0, y: 0 });
  const dragging = useRef<boolean>(false);
  const activeHoverArea = useRef<Location>(Location.NOWHERE);
  const dragState = useStore(dragHandleStore);
  const { fragmentId, paneId, idx, outerIdx, markdownLookup } = props;

  const field = paneFragmentMarkdown.get()[fragmentId].current;
  const outerChildlren = field.markdown.htmlAst.children[outerIdx];
  // @ts-expect-error has children
  let tagName = outerChildlren.tagName;
  if(idx !== null) {
    // @ts-expect-error has children
    tagName = outerChildlren.children[idx].tagName;
  }
  const allowTag = {before: true, after: true}; //allowTagInsert(tagName, outerIdx, idx, markdownLookup);

  const getNodeData = (): DragNode => {
    return {fragmentId, paneId, idx, outerIdx} as DragNode;
  };

  useEffect(() => {
    if (dragging.current || props.ignoreDragNDrop) return;

    if (!dragState.dropState) {
      if (props.self?.current) {
        const rect = props.self?.current.getBoundingClientRect();
        if (isPosInsideRect(rect, dragState.pos)) {
          const loc = dragState.pos.y > rect.y + rect.height / 2 ? Location.AFTER : Location.BEFORE;
          activeHoverArea.current = loc;
          console.log(`inside afterArea: ${props.id} | location: ${loc}`);
          setDragHoverInfo({
            ...getNodeData(),
            markdownLookup,
            location: getFinalLocation(loc, allowTag),
          });
        }
      }
    } else if (dragState.affectedFragments.size > 0) {
      if (
        dragState.dropState.fragmentId === fragmentId &&
        dragState.dropState.paneId === paneId &&
        dragState.dropState.idx === idx &&
        dragState.dropState.outerIdx === outerIdx
      ) {
        console.log(`Drop active element: ${JSON.stringify(dragState.dropState)}`);
      }
    }
  }, [dragState]);

  useEffect(() => {
    const handleMouseMove: EventListener = (event) => {
      const mouseEvent = event as unknown as MouseEvent; // Type assertion to MouseEvent
      const x = mouseEvent.clientX + window.scrollX;
      const y = mouseEvent.clientY + window.scrollY;
      if (dragging.current) {
        setDragPosition({ x, y });
      }
    };

    if(!props.ignoreDragNDrop) {
      document.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const drawGhostBlock = () => {
    return (<div className={`w-full bg-blue-200 h-20`}/>);
  }

  const canDrawGhostBlock = (): boolean => {
    if(lastDragTime.get() === dragStartTime.get())
      return false;

    const el = dragState.hoverElement;
    if(!el || props.ignoreDragNDrop) {
      return false;
    }

    return el.fragmentId === fragmentId
      && el.paneId === paneId
      && el.idx === idx
      && el.outerIdx === outerIdx;
  };

  return (
    <div className="inline">
      {(canDrawGhostBlock() && dragState.hoverElement?.location === "before") && drawGhostBlock()}
      <Draggable
        defaultPosition={{ x: dragPos.x, y: dragPos.y }}
        position={dragPos}
        onStart={() => {
          dragging.current = true;
          resetDragStore();
          const root = paneFragmentMarkdown.get()[props.fragmentId].current.markdown.htmlAst;
          setDragShape({ root, fragmentId, paneId, idx, outerIdx });
          setGhostSize(100, 50);
        }}
        onStop={() => {
          dragging.current = false;
          if (dragHandleStore.get().affectedFragments.size > 0) {
            const dragEl = dragHandleStore.get().dragShape;
            if (dragEl) {
              const hoverEl = dragHandleStore.get().hoverElement;
              if (hoverEl && hoverEl.location !== "none") {
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
      {(canDrawGhostBlock() && dragState.hoverElement?.location === "after") && drawGhostBlock()}
    </div>
)
  ;
});