import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import {
  dragHandleStore,
  type DragNode,
  Location,
  paneFragmentMarkdown,
  setDragHoverInfo,
  toolModeStore,
  unsavedChangesStore,
} from "../../../store/storykeep";
import { allowTagInsert } from "../../../utils/compositor/markdownUtils";
import { toolAddModeTitles } from "../../../constants";
import { classNames, getFinalLocation } from "../../../utils/helpers";
import type { MarkdownLookup, ToolAddMode } from "../../../types";
import { isPosInsideRect } from "@/utils/math.ts";
import { insertElement } from "@/utils/storykeep.ts";
import { GhostBlock } from "@/components/other/GhostBlock.tsx";
import { canDrawGhostBlock } from "@/utils/dragNDropUtils.ts";

interface InsertWrapperProps {
  fragmentId: string;
  paneId: string;
  outerIdx: number;
  idx: number | null;
  queueUpdate: (id: string, updateFn: () => void) => void;
  toolAddMode: ToolAddMode;
  children?: ReactNode;
  markdownLookup: MarkdownLookup;
  isEmpty: boolean;
}

const InsertWrapper = ({
  fragmentId,
  paneId,
  outerIdx,
  idx,
  queueUpdate,
  toolAddMode,
  children,
  markdownLookup,
  isEmpty,
}: InsertWrapperProps) => {
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [fragmentId],
  });
  const $unsavedChanges = useStore(unsavedChangesStore, { keys: [paneId] });
  const contentId = `${outerIdx}${typeof idx === "number" ? `-${idx}` : ""}-${fragmentId}`;
  const allowTag = isEmpty
    ? { before: true, after: true }
    : allowTagInsert(toolAddMode, outerIdx, idx, markdownLookup);

  const dragState = useStore(dragHandleStore);
  const self = useRef<HTMLDivElement>(null);
  const activeHoverArea = useRef<Location>(Location.NOWHERE);

  const getNodeData = (): DragNode => {
    return { fragmentId, paneId, idx, outerIdx } as DragNode;
  };

  useEffect(() => {
    if (!dragState.dropState) {
      if (self.current) {
        const rect = self.current.getBoundingClientRect();
        if (isPosInsideRect(rect, dragState.pos)) {
          const loc =
            dragState.pos.y > rect.y + rect.height / 2
              ? Location.AFTER
              : Location.BEFORE;
          activeHoverArea.current = loc;
          console.log(`inside afterArea: ${fragmentId} | location: ${loc}`);
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
        console.log(
          `Drop active element: ${JSON.stringify(dragState.dropState)}`
        );
        if(dragState.dropState.location !== "none") {
          handleInsert(dragState.dropState.location as "before"|"after");
        }
      }
    }
  }, [dragState]);

  const handleInsert = useCallback(
    (position: "before" | "after") => {
      queueUpdate(contentId, () => {
        insertElement(
          paneId,
          fragmentId,
          toolAddMode,
          isEmpty,
          markdownLookup,
          outerIdx,
          idx,
          position
        );
        toolModeStore.set({ value: `text` });
      });
    },
    [
      fragmentId,
      paneId,
      outerIdx,
      idx,
      queueUpdate,
      toolAddMode,
      markdownLookup,
      isEmpty,
      $paneFragmentMarkdown,
      $unsavedChanges,
      contentId,
    ]
  );

  if (isEmpty) {
    return (
      <div className="relative min-h-[200px] w-full">
        <button
          className="pointer-events-auto relative z-103 h-full min-h-[200px] w-full bg-mygreen/20 hover:bg-mygreen/50"
          title={`Add ${toolAddModeTitles[toolAddMode]}`}
          onClick={() => handleInsert("before")}
        >
          <div
            className="absolute left-1/2 top-1/2 mx-6 -translate-x-1/2 -translate-y-1/2
             transform rounded-sm bg-mywhite p-2.5 font-action
             text-xl text-black shadow-md md:text-3xl"
          >
            Add {toolAddModeTitles[toolAddMode]}
          </div>
        </button>
      </div>
    );
  }

  const canDrawGhost = canDrawGhostBlock(fragmentId, paneId, idx, outerIdx, false);
  return (
    <div className="relative" ref={self}>
      {(canDrawGhost && dragState.hoverElement?.location === "before") && <GhostBlock/>}
      {children}
      {(canDrawGhost && dragState.hoverElement?.location === "after") && <GhostBlock/>}
      <div
        className={classNames(
          "z-100 group/top group absolute inset-x-0 top-0 h-1/2 ",
          allowTag.before ? `cursor-pointer` : ``
        )}
      >
        {allowTag.before && (
          <>
            <div
              className="text-md absolute left-0 top-1/2 ml-6
             -translate-y-1/2 transform rounded-sm bg-yellow-300 p-1.5
             font-action text-black shadow-md group-hover:bg-black group-hover:text-white"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </div>
            <div
              onClick={() => handleInsert("before")}
              title={`Insert new ${toolAddModeTitles[toolAddMode]} above`}
              className="absolute inset-0 h-full w-full
                     before:absolute before:left-0 before:right-0 before:top-0
                     before:h-1 before:border-t-4 before:border-dotted before:border-mylightgrey/25 before:content-[''] hover:bg-gradient-to-b
                     hover:from-mylightgrey/25 hover:via-mylightgrey/25 hover:to-transparent hover:before:border-mylightgrey"
            />
          </>
        )}
      </div>
      <div
        className={classNames(
          "z-100 group/bottom group absolute inset-x-0 bottom-0 h-1/2 ",
          allowTag.after ? `cursor-pointer` : ``
        )}
      >
        {allowTag.after && (
          <>
            <div
              className="text-md absolute right-0 top-1/2 mr-6
             -translate-y-1/2 transform rounded-sm bg-yellow-300 p-1.5
             font-action text-black shadow-md group-hover:bg-black group-hover:text-white"
            >
              <ArrowDownIcon className="h-4 w-4" />
            </div>
            <div
              onClick={() => handleInsert("after")}
              title={`Insert new ${toolAddModeTitles[toolAddMode]} below`}
              className="absolute inset-0 h-full w-full
                     after:absolute after:bottom-0 after:left-0 after:right-0
                     after:h-1 after:border-b-4 after:border-dotted after:border-mylightgrey/25 after:content-[''] hover:bg-gradient-to-t
                     hover:from-mylightgrey/25 hover:via-mylightgrey/25 hover:to-transparent hover:after:border-mylightgrey"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default InsertWrapper;
