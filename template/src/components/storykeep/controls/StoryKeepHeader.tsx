import { useEffect, useState, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import ArrowUturnLeftIcon from "@heroicons/react/24/outline/ArrowUturnLeftIcon";
import ArrowUturnRightIcon from "@heroicons/react/24/outline/ArrowUturnRightIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import BugAntIcon from "@heroicons/react/24/outline/BugAntIcon";
import CursorArrowRaysIcon from "@heroicons/react/24/outline/CursorArrowRaysIcon";
import ArrowTopRightOnSquareIcon from "@heroicons/react/24/outline/ArrowTopRightOnSquareIcon";
import {
  keyboardAccessible,
  showAnalytics,
  viewportStore,
  viewportKeyStore,
  viewportSetStore,
  settingsPanelStore,
} from "@/store/storykeep.ts";
import { contentMap } from "@/store/events.ts";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes.ts";
import { debounce } from "@/utils/common/helpers";
import ViewportSelector from "./state/ViewportSelector";
import SaveModal from "./state/SaveModal";

const offset = 64 + 16 + 16;

const getViewportFromWidth = (width: number): "mobile" | "tablet" | "desktop" => {
  if (width >= 1368 + offset) return "desktop";
  if (width >= 801 + offset) return "tablet";
  return "mobile";
};

interface StoryKeepHeaderProps {
  keyboardAccessibleEnabled: boolean;
  nodeId: string;
}

const StoryKeepHeader = ({ keyboardAccessibleEnabled, nodeId }: StoryKeepHeaderProps) => {
  const $viewportSet = useStore(viewportSetStore);
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const $showAnalytics = useStore(showAnalytics);
  const $keyboardAccessible = useStore(keyboardAccessible);
  const $contentMap = useStore(contentMap);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const ctx = getCtx();
  const hasTitle = useStore(ctx.hasTitle);
  const allNodes = ctx.allNodes.get();
  const node = allNodes.get(nodeId);
  const url =
    node && `slug` in node && node?.nodeType === `StoryFragment`
      ? `/${node.slug}`
      : node && `slug` in node && node?.nodeType === `Pane`
        ? `/context/${node.slug}`
        : null;

  const savedNode = $contentMap.find((item) => item.id === nodeId);
  const isVisitable =
    !!node && !!savedNode && `slug` in node && `slug` in savedNode && savedNode.slug === node.slug;

  const rafId = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (keyboardAccessibleEnabled && !$keyboardAccessible) {
      keyboardAccessible.set(true);
    }
  }, [keyboardAccessibleEnabled, $keyboardAccessible]);

  useEffect(() => {
    const updateUndoRedo = () => {
      setCanUndo(getCtx().history.canUndo());
      setCanRedo(getCtx().history.canRedo());
    };
    getCtx().history.headIndex.listen(updateUndoRedo);
    getCtx().history.history.listen(updateUndoRedo);
  }, []);

  const updateViewportKey = useCallback(() => {
    if (!mounted || $viewportSet || $viewport.value !== "auto") return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const newViewportKey = getViewportFromWidth(window.innerWidth);
      if (newViewportKey !== $viewportKey.value) {
        viewportKeyStore.set({ value: newViewportKey });
      }
    });
  }, [mounted, $viewportSet, $viewport.value, $viewportKey.value]);

  const debouncedUpdateViewportKey = useCallback(debounce(updateViewportKey, 100), [
    updateViewportKey,
  ]);

  useEffect(() => {
    if (!mounted) return;
    updateViewportKey();
    window.addEventListener("resize", debouncedUpdateViewportKey);
    return () => {
      window.removeEventListener("resize", debouncedUpdateViewportKey);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [mounted, debouncedUpdateViewportKey, updateViewportKey]);

  const setViewport = useCallback(
    (newViewport: "auto" | "mobile" | "tablet" | "desktop") => {
      const isAuto = newViewport === "auto";
      viewportSetStore.set(!isAuto);
      viewportStore.set({ value: newViewport });
      if (mounted) {
        const newViewportKey = isAuto ? getViewportFromWidth(window.innerWidth) : newViewport;
        requestAnimationFrame(() => {
          viewportKeyStore.set({ value: newViewportKey });
        });
      }
    },
    [mounted]
  );

  const showDebugPanel = () => {
    settingsPanelStore.set(null);
    getCtx().toolModeValStore.set({ value: "default" });
    settingsPanelStore.set({ nodeId: ``, action: `debug`, expanded: true });
    getCtx().notifyNode(`root`);
  };

  const handleSave = () => {
    settingsPanelStore.set(null);
    const dirtyNodes = ctx.getDirtyNodes();
    if (dirtyNodes.length === 0) {
      console.log("No changes to save");
      return;
    }
    ctx.rootNodeId.set(nodeId);
    setShowSaveModal(true);
  };

  const handleSaveComplete = () => {
    console.log(`SAVE COMPLETE`);
  };

  const handleCancel = () => {
    settingsPanelStore.set(null);
    if (canUndo) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        window.location.href = "/storykeep";
      }
    } else {
      window.location.href = "/storykeep";
    }
  };

  const visitPage = () => {
    settingsPanelStore.set(null);
    if (!isVisitable) {
      alert("Please save the node first to visit the page.");
      return;
    }
    if (canUndo && typeof url === `string`) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        window.location.href = url;
      }
    } else if (typeof url === `string`) {
      window.location.href = url;
    }
  };

  const handleUndo = () => {
    settingsPanelStore.set(null);
    getCtx().history.undo();
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const handleRedo = () => {
    settingsPanelStore.set(null);
    getCtx().history.redo();
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const toggleAnalytics = () => {
    settingsPanelStore.set(null);
    showAnalytics.set(!$showAnalytics);
    getCtx().toolModeValStore.set({ value: "default" });
    settingsPanelStore.set(null);
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const toggleKeyboardAccessible = () => {
    settingsPanelStore.set(null);
    keyboardAccessible.set(!$keyboardAccessible);
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const iconClassName =
    "w-8 h-8 text-myblue hover:text-white hover:bg-myblue rounded-xl hover:rounded bg-white p-1";
  const disabledIconClassName =
    "w-8 h-8 text-gray-400 cursor-not-allowed rounded-xl bg-white p-1 opacity-50";

  const viewportSelectorContent = mounted ? (
    <ViewportSelector
      viewport={$viewport.value}
      viewportKey={$viewportKey.value}
      auto={!$viewportSet}
      setViewport={setViewport}
    />
  ) : null;

  return (
    <div className="p-2 flex flex-wrap justify-center items-center gap-y-2 gap-x-6">
      {hasTitle && node && (
        <>
          {viewportSelectorContent}
          {(canUndo || canRedo) && (
            <div className="flex flex-wrap justify-center items-center gap-2">
              <ArrowUturnLeftIcon
                title="Undo"
                style={{ visibility: canUndo ? "visible" : "hidden" }}
                className={iconClassName}
                onClick={handleUndo}
              />
              <ArrowUturnRightIcon
                title="Redo"
                style={{ visibility: canRedo ? "visible" : "hidden" }}
                className={iconClassName}
                onClick={handleRedo}
              />
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap justify-center items-center gap-2">
        {canUndo ? (
          <>
            <button
              onClick={handleSave}
              className="bg-white text-myblue hover:underline font-action font-bold"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="bg-white text-myblue hover:underline font-action font-bold"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleCancel}
            className="bg-white text-myblue hover:underline font-action font-bold"
          >
            Exit
          </button>
        )}
      </div>

      {hasTitle && node && (
        <div className="flex flex-wrap justify-center items-center gap-2">
          <button onClick={toggleAnalytics} title="Toggle Interaction Analytics">
            <PresentationChartBarIcon
              className={`${$showAnalytics ? "-rotate-6 w-8 h-8 text-white rounded bg-myblue p-1" : iconClassName}`}
            />
          </button>
          {import.meta.env.DEV ? (
            <button onClick={showDebugPanel} title="Reveal Debug Panel">
              <BugAntIcon className={iconClassName} />
            </button>
          ) : null}
          {!keyboardAccessibleEnabled && (
            <button onClick={toggleKeyboardAccessible} title="Toggle Mobile/Keyboard Accessibility">
              <CursorArrowRaysIcon
                className={`${$keyboardAccessible ? "-rotate-6 w-8 h-8 text-white rounded bg-myblue p-1" : iconClassName}`}
              />
            </button>
          )}
          <button
            onClick={visitPage}
            title={isVisitable ? "Visit Page" : "Save first to visit"}
            disabled={!isVisitable}
            className={isVisitable ? iconClassName : disabledIconClassName}
          >
            <ArrowTopRightOnSquareIcon />
          </button>
        </div>
      )}

      {showSaveModal && (
        <SaveModal
          nodeId={nodeId}
          onClose={() => setShowSaveModal(false)}
          onSaveComplete={handleSaveComplete}
        />
      )}
    </div>
  );
};

export default StoryKeepHeader;
