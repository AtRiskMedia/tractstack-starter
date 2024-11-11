import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { ulid } from "ulid";
import {
  editModeStore,
  paneInit,
  storyFragmentInit,
  creationStateStore,
} from "../../store/storykeep";
import { PaneSettings } from "./settings/PaneSettings";
import { PaneBreakSettings } from "./settings/PaneBreakSettings";
import { PaneInsert } from "./settings/PaneInsert";
import { PaneAstStyles } from "./settings/PaneAstStyles";
import { useEditModalDimensions } from "../../hooks/useEditModalDimensions";
import { classNames } from "../../utils/helpers";
import type { ContentMap, FileDatum } from "../../types";

interface EditModalProps {
  id: string;
  contentMap: ContentMap[];
  files: FileDatum[];
}

export const EditModal = ({ id, contentMap, files }: EditModalProps) => {
  const $creationState = useStore(creationStateStore);
  const thisId = id !== `create` ? id : ($creationState.id ?? `error`);
  const [isClient, setIsClient] = useState(false);
  const $editMode = useStore(editModeStore);
  const contentId = `${$editMode?.targetId?.tag}-${$editMode?.targetId?.outerIdx}${typeof $editMode?.targetId?.idx === "number" ? `-${$editMode.targetId.idx}` : ""}-${$editMode?.id}`;
  const $storyFragmentInit = useStore(storyFragmentInit);
  const $paneInit = useStore(paneInit);
  const contentRef = useRef<HTMLDivElement>(null);
  const isVisible = $editMode !== null;
  const { height, width, position, isFullWidthMobileShort } = useEditModalDimensions();

  const [shouldScroll, setShouldScroll] = useState(false);
  const scrollToTarget = useCallback(() => {
    if ($editMode?.targetId) {
      const targetId = `${$editMode.targetId.paneId}-${$editMode.targetId.tag}-${$editMode.targetId.outerIdx}${$editMode.targetId.idx !== null ? `-${$editMode.targetId.idx}` : ""}`;
      const targetElement = document.getElementById(targetId);
      const modalElement = document.getElementById("edit-modal");
      if (targetElement && modalElement) {
        const modalRect = modalElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const currentScrollY = window.scrollY;
        const modalHeight = modalRect.height;
        const spaceAboveModal = viewportHeight - modalHeight;
        const targetDesiredTop = Math.max(spaceAboveModal / 2 - targetRect.height / 2, 0);
        const newScrollY = currentScrollY + targetRect.top - targetDesiredTop;
        const finalScrollY = Math.max(0, newScrollY);
        window.scrollTo({
          top: finalScrollY,
          behavior: "smooth",
        });
      }
    }
  }, [$editMode?.targetId]);

  useEffect(() => {
    if ((shouldScroll || $editMode?.targetId) && isVisible && isFullWidthMobileShort) {
      setTimeout(() => {
        scrollToTarget();
        setShouldScroll(false);
      }, 100);
    }
  }, [shouldScroll, $editMode?.targetId, isVisible, scrollToTarget]);

  useEffect(() => {
    if (
      ($editMode?.type === `pane` && $editMode?.mode === `insert`) ||
      ($editMode?.type === `storyfragment` && $storyFragmentInit[$editMode.id].init) ||
      ($editMode?.type === `pane` && $paneInit[$editMode.id].init)
    )
      setIsClient(true);
  }, [$storyFragmentInit, $paneInit, $editMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && $editMode !== null) {
        toggleOffEditModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [$editMode]);

  const toggleOffEditModal = () => {
    if (
      $editMode?.type === `pane` &&
      $editMode?.mode === `insert` &&
      typeof $editMode?.payload !== `undefined`
    ) {
      const cancelInsert = $editMode?.payload?.cancelInsert;
      if (cancelInsert) cancelInsert();
    }
    editModeStore.set(null);
  };

  if (!isClient) return null;

  if ($editMode?.type === `storyfragment` && $editMode?.mode === `settings`) return null;

  return (
    <div className="relative">
      <div
        id="edit-modal"
        className={classNames(
          `fixed z-[9000] pb-8`,
          `backdrop-blur-sm bg-mydarkgrey/50`,
          `bg-mywhite shadow-lg transition-all duration-300 ease-in-out`,
          isFullWidthMobileShort
            ? `border-t-4 border-mylightgrey/50`
            : `border-t-4 border-l-4 border-r-4 border-mylightgrey/50 rounded-tl-xl rounded-tr-xl`
        )}
        style={{
          height: height,
          width,
          ...position,
          display: isVisible ? "block" : "none",
          maxHeight: "80vh",
        }}
      >
        <div className="relative">
          <button
            onClick={toggleOffEditModal}
            className={classNames(
              "absolute z-[9001] bg-black hover:bg-myorange text-white rounded-full p-2 shadow-lg",
              "transition-all duration-300 ease-in-out",
              "-top-12 right-2"
            )}
            title={$editMode?.mode === `insert` ? `Cancel Insert` : `Close panel`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div ref={contentRef} className={classNames("h-full flex flex-col p-4")}>
          <div className={classNames("px-3.5 relative flex-grow")}>
            {$editMode?.type === `pane` &&
            $editMode?.mode === `insert` &&
            typeof $editMode?.payload !== `undefined` ? (
              <PaneInsert
                storyFragmentId={$editMode.id}
                paneId={
                  $editMode.payload.selectedDesign.id === $editMode.payload.selectedDesign.slug
                    ? ulid()
                    : $editMode.payload.selectedDesign.id
                }
                payload={$editMode.payload}
                toggleOff={toggleOffEditModal}
                doInsert={$editMode?.payload?.doInsert}
                contentMap={contentMap}
                reuse={
                  $editMode.payload.selectedDesign.id !== $editMode.payload.selectedDesign.slug
                }
              />
            ) : $editMode?.type === `pane` && $editMode?.mode === `settings` ? (
              <PaneSettings id={$editMode.id} storyFragmentId={thisId} contentMap={contentMap} />
            ) : $editMode?.type === `pane` &&
              $editMode?.mode === `styles` &&
              typeof $editMode.targetId !== `undefined` ? (
              <PaneAstStyles
                key={contentId}
                id={thisId}
                files={files}
                targetId={$editMode.targetId}
              />
            ) : $editMode?.type === `pane` && $editMode?.mode === `break` ? (
              <PaneBreakSettings id={$editMode.id} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
