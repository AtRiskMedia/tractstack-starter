import { useEffect, useState, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import ArrowUturnLeftIcon from "@heroicons/react/24/outline/ArrowUturnLeftIcon";
import ArrowUturnRightIcon from "@heroicons/react/24/outline/ArrowUturnRightIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import BugAntIcon from "@heroicons/react/24/outline/BugAntIcon";
import CursorArrowRaysIcon from "@heroicons/react/24/outline/CursorArrowRaysIcon";
import {
  keyboardAccessible,
  showAnalytics,
  viewportStore,
  viewportKeyStore,
  viewportSetStore,
  settingsPanelStore,
} from "@/store/storykeep.ts";
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

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Use a ref to track the RAF ID
  const rafId = useRef<number | null>(null);

  // Set mounted state after initial render
  useEffect(() => {
    setMounted(true);
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Handle keyboard accessibility setting
  useEffect(() => {
    if (keyboardAccessibleEnabled && !$keyboardAccessible) {
      keyboardAccessible.set(true);
    }
  }, [keyboardAccessibleEnabled, $keyboardAccessible]);

  // Track undo/redo state
  useEffect(() => {
    const updateUndoRedo = () => {
      setCanUndo(getCtx().history.canUndo());
      setCanRedo(getCtx().history.canRedo());
    };

    getCtx().history.headIndex.listen(() => {
      updateUndoRedo();
    });

    getCtx().history.history.listen(() => {
      updateUndoRedo();
    });
  }, []);

  // Create debounced update function with RAF
  const updateViewportKey = useCallback(() => {
    if (!mounted || $viewportSet || $viewport.value !== "auto") return;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

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

  // Handle viewport updates
  useEffect(() => {
    if (!mounted) return;

    // Initial update using RAF
    updateViewportKey();

    // Add debounced resize listener
    window.addEventListener("resize", debouncedUpdateViewportKey);

    return () => {
      window.removeEventListener("resize", debouncedUpdateViewportKey);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
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
    getCtx().toolModeValStore.set({ value: "default" });
    settingsPanelStore.set({ nodeId: ``, action: `debug`, expanded: true });
    getCtx().notifyNode(`root`);
  };

  const handleSave = () => {
    const ctx = getCtx();
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
    if (canUndo) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        window.location.href = "/storykeep";
      }
    } else {
      window.location.href = "/storykeep";
    }
  };

  const handleUndo = () => {
    getCtx().history.undo();
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const handleRedo = () => {
    getCtx().history.redo();
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const toggleAnalytics = () => {
    showAnalytics.set(!$showAnalytics);
    getCtx().toolModeValStore.set({ value: "default" });
    settingsPanelStore.set(null);
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const toggleKeyboardAccessible = () => {
    keyboardAccessible.set(!$keyboardAccessible);
    getCtx().notifyNode(ROOT_NODE_NAME);
  };

  const iconClassName =
    "w-8 h-8 text-myblue hover:text-white hover:bg-myblue rounded-xl hover:rounded bg-white p-1";
  const iconActiveClassName = "-rotate-6 w-8 h-8 text-white rounded bg-myblue p-1";

  // Only render viewport selector after mounting to avoid hydration mismatch
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
            Close
          </button>
        )}
      </div>

      <div className="flex flex-wrap justify-center items-center gap-2">
        <button onClick={toggleAnalytics} title="Toggle Interaction Analytics">
          <PresentationChartBarIcon
            className={`${$showAnalytics ? iconActiveClassName : iconClassName}`}
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
              className={`${$keyboardAccessible ? iconActiveClassName : iconClassName}`}
            />
          </button>
        )}
      </div>

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
