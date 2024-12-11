import { useState, useMemo, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import ArrowDownIcon from "@heroicons/react/24/outline/ArrowDownIcon";
import {
  paneInit,
  paneTitle,
  paneCodeHook,
  lastInteractedPaneStore,
  visiblePanesStore,
  editModeStore,
  showAnalytics,
  storedAnalytics,
} from "../../store/storykeep";
import AnalyticsWrapper from "./nivo/AnalyticsWrapper";
import Pane from "./Pane";
import CodeHookWrapper from "./CodeHookWrapper";
import { isFullScreenEditModal } from "../../utils/storykeep";
import { classNames } from "../../utils/helpers";
import type { ReactNode } from "react";
import type { ViewportAuto, ToolMode, ToolAddMode } from "../../types";
import ChangeLayoutModal from "@/components/storykeep/components/ChangeLayoutModal.tsx";
import ChangeMarkdownModal from "@/components/storykeep/components/ChangeMarkdownModal.tsx";

const InsertAboveBelowWrapper = ({
  children,
  onInsertClick,
}: {
  children: ReactNode;
  onInsertClick: (position: "above" | "below") => void;
}) => {
  return (
    <div className="relative">
      {children}
      <div className="group absolute inset-x-0 top-0 h-1/2 z-10 cursor-pointer group/top  hover:backdrop-blur-sm hover:bg-white/10 hover:dark:bg-black/10">
        <>
          <div
            className="absolute top-1/2 left-0 transform -translate-y-1/2
             text-black bg-yellow-300 p-1.5 rounded-sm shadow-md
             text-md font-action ml-6 group-hover:bg-black group-hover:text-white"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </div>
          <div
            onClick={() => onInsertClick("above")}
            title="Insert new Pane above this one"
            className="absolute inset-0 w-full h-full
                     before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-4
                     before:border-t-4 before:border-dashed before:border-white/25 hover:before:border-white"
          />
        </>
      </div>
      <div className="group absolute inset-x-0 bottom-0 h-1/2 z-10 cursor-pointer group/bottom  hover:backdrop-blur-sm hover:bg-white/10 hover:dark:bg-black/10">
        <>
          <div
            className="absolute top-1/2 right-0 transform -translate-y-1/2
             text-black bg-yellow-300 p-1.5 rounded-sm shadow-md
             text-md font-action mr-6 group-hover:bg-black group-hover:text-white"
          >
            <ArrowDownIcon className="h-4 w-4" />
          </div>
          <div
            onClick={() => onInsertClick("below")}
            title="Insert new Pane below this one"
            className="absolute inset-0 w-full h-full
                     after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-4
                     after:border-b-4 after:border-dashed after:border-white/25 hover:after:border-white"
          />
        </>
      </div>
    </div>
  );
};

const PaneWrapper = (props: {
  id: string;
  slug: string;
  isContext: boolean;
  viewportKey: ViewportAuto;
  insertPane: (paneId: string, position: `above` | `below`) => void;
  toolMode: ToolMode;
  toolAddMode: ToolAddMode;
  isDesigningNew: boolean;
}) => {
  const { id, slug, isContext, toolMode, toolAddMode, viewportKey, insertPane, isDesigningNew } =
    props;
  const [isClient, setIsClient] = useState(false);
  const $showAnalytics = useStore(showAnalytics);
  const $storedAnalytics = useStore(storedAnalytics);
  const $paneInit = useStore(paneInit, { keys: [id] });
  const $paneTitle = useStore(paneTitle, { keys: [id] });
  const $paneCodeHook = useStore(paneCodeHook, { keys: [id] });
  const $editMode = useStore(editModeStore);
  const isCodeHook = $paneCodeHook?.[id]?.current;
  const [paneElement, setPaneElement] = useState<HTMLDivElement | null>(null);
  const [changingLayout, setChangingLayout] = useState<boolean>(false);
  const [changingMarkdown, setChanginMarkdown] = useState<boolean>(false);

  const paneRef = useCallback(
    (node: HTMLDivElement) => {
      if (node !== null) {
        setPaneElement(node);
      }
    },
    [id]
  );

  useEffect(() => {
    if ($paneInit[id]?.init) {
      setIsClient(true);
    }
  }, [id, $paneInit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        $editMode?.type === "pane" &&
        $editMode?.mode === "settings" &&
        $editMode.id === id
      ) {
        toggleOffEditModal();
        /* eslint-disable @typescript-eslint/no-explicit-any */
        (event as any).handledByComponent = true;
      }
    };
    // Use capture phase to ensure this runs before global handler
    paneElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      paneElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [$editMode, id, paneElement]);

  const toggleOffEditModal = useCallback(() => {
    editModeStore.set(null);
  }, []);

  const handleEditModeToggle = () => {
    if ($editMode?.type === "pane" && $editMode?.mode === "settings" && $editMode.id === id) {
      toggleOffEditModal();
    } else {
      editModeStore.set({
        id,
        mode: "settings",
        type: "pane",
      });
    }
  };

  const handleClick = () => {
    lastInteractedPaneStore.set(id);
    if (toolMode === `settings`) {
      handleEditModeToggle();
    }
  };

  const handleInsertClick = (position: "above" | "below") => {
    if (toolMode === "pane") {
      insertPane(id, position);
    }
  };

  useEffect(() => {
    if (!paneElement || isFullScreenEditModal($editMode?.mode || ``)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visiblePanesStore.setKey(id, entry.isIntersecting);
        if (!entry.isIntersecting) {
          const currentEditMode = editModeStore.get();
          if (
            currentEditMode?.type === "pane" &&
            (currentEditMode.mode === "settings" ||
              currentEditMode.mode === "break" ||
              currentEditMode.mode === "styles") &&
            currentEditMode.id === id
          ) {
            toggleOffEditModal();
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(paneElement);

    return () => {
      observer.disconnect();
    };
  }, [paneElement, id, $editMode]);

  const Content = useMemo(() => {
    return isCodeHook ? (
      <CodeHookWrapper id={id} toolMode={toolMode} viewportKey={viewportKey} />
    ) : (
      <Pane
        id={id}
        slug={slug}
        isContext={isContext}
        toolMode={toolMode}
        toolAddMode={toolAddMode}
        viewportKey={viewportKey}
      />
    );
  }, [id, isCodeHook, toolMode, toolAddMode, viewportKey]);

  const onChangeLayoutClicked = () => {
    setChangingLayout(true);
  }

  const onChangeMarkdownClicked = () => {
    setChanginMarkdown(true);
  }

  if (!isClient) return null;

  return (
    <div ref={paneRef} className="relative">
      <div
        onClick={handleClick}
        className={classNames(
          "w-full",
          toolMode === `settings` ? "pointer-events-auto cursor-pointer" : ""
        )}
      >
        {toolMode === `pane` && !isDesigningNew ? (
          <InsertAboveBelowWrapper onInsertClick={handleInsertClick}>
            {Content}
          </InsertAboveBelowWrapper>
        ) : (
          Content
        )}
        {toolMode === "styles" && (
          <div className="absolute inset-0 flex justify-end w-full h-fit">
            <div className="relative">
                <button className="text-xl p-4 mr-6 mt-2 bg-yellow-300 text-black font-bold mb-2 group-hover:text-white"
                        onClick={onChangeLayoutClicked}>
                  Change Layout
                </button>
            </div>
          </div>
        )}
        {toolMode === "text" && (
          <div className="absolute inset-0 flex justify-end w-full h-fit">
            <div className="relative">
              <button className="text-xl p-4 mr-6 mt-2 bg-amber-300 text-black font-bold mb-2 group-hover:text-white"
                      onClick={onChangeMarkdownClicked}>
                Edit Markdown
              </button>
            </div>
          </div>
        )}
        {changingLayout && <ChangeLayoutModal paneId={props.id}
                                              slug={props.slug}
                                              isContext={props.isContext}
                                              viewportKey={props.viewportKey}
                                              onClose={() => setChangingLayout(false)}/> }
        {changingMarkdown && <ChangeMarkdownModal />}
        {toolMode === "settings" && (
          <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-black/50 flex items-center justify-center group z-104 cursor-pointer pointer-events-auto">
            <div className="relative">
              <div className="bg-yellow-300 p-4 rounded-md group-hover:bg-black">
                <h2 className="text-xl text-black font-bold mb-2 group-hover:text-white">
                  Configure this Pane
                </h2>
              </div>
            </div>
          </div>
        )}
      </div>
      {$showAnalytics && $storedAnalytics[id] && (
        <AnalyticsWrapper
          data={$storedAnalytics[id]}
          title={$paneTitle[id].current}
          isPane={true}
        />
      )}
    </div>
  );
};

export default PaneWrapper;
