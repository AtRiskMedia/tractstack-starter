import { memo, type MouseEvent, type RefObject, useEffect, useRef, useState } from "react";
import Draggable, { type ControlPosition } from "react-draggable";
import {
  dragHandleStore,
  type DragNode,
  dropDraggingElement,
  Location,
  paneFragmentMarkdown,
  resetDragStore,
  setDragHoverInfo,
  setDragPosition,
  setDragShape,
  setGhostBlockHeight,
} from "@/store/storykeep.ts";
import type { MarkdownLookup } from "@/types.ts";
import { isPosInsideRect } from "@/utils/math.ts";
import { useStore } from "@nanostores/react";
import { canDrawGhostBlock, getRelativeYLocationToElement } from "@/utils/dragNDropUtils.ts";
import { allowTagInsert, allowWidgetInsert } from "@/utils/compositor/markdownUtils.ts";
import { toolAddModeDefaultHeight } from "@/constants.ts";
import { getFinalLocation } from "@/utils/common/helpers.ts";
import { moveElements } from "@/utils/storykeep/StoryKeep_utils.ts";
import { GhostBlock } from "@/components/storykeep/GhostBlock.tsx";

export type MoveDraggableElementProps = {
  children?: React.ReactElement;
  ignoreDragNDrop: boolean;
  fragmentId: string;
  paneId: string;
  idx: number | null;
  id: string;
  outerIdx: number;
  markdownLookup: MarkdownLookup;
  self?: RefObject<HTMLDivElement> | null;
};

export const MoveDraggableElement = memo((props: MoveDraggableElementProps) => {
  const [dragPos, setDragPos] = useState<ControlPosition>({ x: 0, y: 0 });
  const domRef = useRef(null);
  const dragging = useRef<boolean>(false);
  const activeHoverArea = useRef<Location>(Location.NOWHERE);
  const dragState = useStore(dragHandleStore);
  const { fragmentId, paneId, idx, outerIdx, markdownLookup } = props;

  let allowTag = { before: true, after: true };
  if (dragState.dragShape) {
    const dragShape = dragState.dragShape;
    const field = paneFragmentMarkdown.get()[dragShape.fragmentId].current;
    const outerChildlren = field.markdown.htmlAst.children[dragShape.outerIdx];
    // @ts-expect-error has children
    let tagName = outerChildlren.tagName;
    const isWidget =
      typeof dragShape.idx === `number` &&
      typeof dragShape.markdownLookup.codeItemsLookup[dragShape.outerIdx] !== `undefined`
        ? typeof dragShape.markdownLookup.codeItemsLookup[dragShape.outerIdx][dragShape.idx] ===
          `number`
        : false;

    const isImage =
      typeof dragShape.idx === `number` &&
      typeof dragShape.markdownLookup.imagesLookup[dragShape.outerIdx] !== `undefined`
        ? typeof dragShape.markdownLookup.imagesLookup[dragShape.outerIdx][dragShape.idx] ===
          `number`
        : false;

    const isListElement = isWidget || isImage;

    if (dragShape.idx !== null && !isListElement) {
      // @ts-expect-error has children
      if (outerChildlren.children[dragShape.idx].children[0].type === "text") {
        tagName = "p"; // disguise as p for now if that's an inner text element in list
      }
    }
    if (isListElement) {
      allowTag = allowWidgetInsert(outerIdx, idx, markdownLookup);
    } else if (idx === null) {
      // skip inner list elements check for now
      allowTag = allowTagInsert(tagName, outerIdx, idx, markdownLookup);
    }
  }

  const getNodeData = (): DragNode => {
    return { fragmentId, paneId, idx, outerIdx } as DragNode;
  };

  useEffect(() => {
    if (dragging.current || props.ignoreDragNDrop) return;

    if (!dragState.elDropState) {
      if (props.self?.current) {
        const rect = props.self?.current.getBoundingClientRect();
        if (isPosInsideRect(rect, dragState.pos)) {
          const loc = getRelativeYLocationToElement(dragState.pos.y, rect);
          activeHoverArea.current = loc;
          console.log(
            `inside afterArea: ${props.id} | location: ${loc} | ${dragState.pos.y} | ${rect.y} h: ${rect.height}`
          );
          setTimeout(() => {
            setDragHoverInfo({
              ...getNodeData(),
              markdownLookup,
              location: getFinalLocation(loc, allowTag),
            });
          }, 0);
        }
      }
    } else if (dragState.affectedFragments.size > 0) {
      if (
        dragState.elDropState.fragmentId === fragmentId &&
        dragState.elDropState.paneId === paneId &&
        dragState.elDropState.idx === idx &&
        dragState.elDropState.outerIdx === outerIdx
      ) {
        console.log(`Drop active element: ${JSON.stringify(dragState.elDropState)}`);
      }
    }
  }, [dragState]);

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

  const canDrawGhost = canDrawGhostBlock(fragmentId, paneId, idx, outerIdx, props.ignoreDragNDrop);

  return (
    <div className="inline">
      {canDrawGhost && dragState.hoverElement?.location === "before" && <GhostBlock />}
      <Draggable
        nodeRef={domRef}
        defaultPosition={{ x: dragPos.x, y: dragPos.y }}
        position={dragPos}
        onStart={() => {
          dragging.current = true;
          resetDragStore();
          const root = paneFragmentMarkdown.get()[props.fragmentId].current.markdown.htmlAst;
          setDragShape({ markdownLookup, root, fragmentId, paneId, idx, outerIdx });
          setGhostBlockHeight(toolAddModeDefaultHeight);
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
                  hoverEl.location
                );
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