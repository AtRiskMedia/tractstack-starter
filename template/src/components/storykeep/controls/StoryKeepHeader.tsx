import { useEffect, useState, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import QuestionMarkCircleIcon from "@heroicons/react/24/outline/QuestionMarkCircleIcon";
import ShieldExclamationIcon from "@heroicons/react/24/outline/ShieldExclamationIcon";
import ArrowUturnLeftIcon from "@heroicons/react/24/outline/ArrowUturnLeftIcon";
import ArrowUturnRightIcon from "@heroicons/react/24/outline/ArrowUturnRightIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import CursorArrowRaysIcon from "@heroicons/react/24/outline/CursorArrowRaysIcon";
import ArrowTopRightOnSquareIcon from "@heroicons/react/24/outline/ArrowTopRightOnSquareIcon";
import {
  keyboardAccessible,
  showAnalytics,
  viewportStore,
  viewportKeyStore,
  viewportSetStore,
  settingsPanelStore,
  isDemoModeStore,
} from "@/store/storykeep.ts";
import { showHelpStore } from "@/store/help";
import { contentMap } from "@/store/events";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes";
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
  isContext: boolean;
}

const StoryKeepHeader = ({
  keyboardAccessibleEnabled,
  nodeId,
  isContext = false,
}: StoryKeepHeaderProps) => {
  const isDemoMode = isDemoModeStore.get();
  const $viewportSet = useStore(viewportSetStore);
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const $showAnalytics = useStore(showAnalytics);
  const $keyboardAccessible = useStore(keyboardAccessible);
  const $contentMap = useStore(contentMap);
  const $showHelp = useStore(showHelpStore);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const ctx = getCtx();
  const hasTitle = useStore(ctx.hasTitle);
  const hasPanes = useStore(ctx.hasPanes);
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

  const handleSave = () => {
    settingsPanelStore.set(null);
    const dirtyNodes = ctx.getDirtyNodes();
    if (dirtyNodes.length === 0) {
      console.warn(`no unsaved changes found.`);
      return;
    }
    ctx.rootNodeId.set(nodeId);
    setShowSaveModal(true);
  };

  const handleSaveComplete = () => {
    // do nothing
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

  const toggleShowHelp = () => {
    showHelpStore.set(!$showHelp);
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
    <div className="p-2 flex flex-wrap justify-center items-center gap-y-2 gap-x-4">
      {hasTitle && (hasPanes || isContext) && node && (
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

      <div className="text-sm flex flex-wrap justify-center items-center gap-2">
        {hasTitle && (hasPanes || isContext) && canUndo ? (
          <>
            <button
              onClick={handleSave}
              className="bg-white text-myblue hover:underline font-action font-bold"
              disabled={isDemoMode}
              title={isDemoMode ? `Demo mode. Changes cannot be saved.` : `Save changes`}
              style={{
                textDecoration: isDemoMode ? "line-through" : "none",
                cursor: isDemoMode ? "not-allowed" : "pointer",
              }}
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

      {hasTitle && (hasPanes || isContext) && node && (
        <div className="flex flex-wrap justify-center items-center gap-1">
          <button onClick={toggleAnalytics} title="Toggle Interaction Analytics">
            <PresentationChartBarIcon
              className={`${$showAnalytics ? "-rotate-6 w-8 h-8 text-white rounded bg-myblue p-1" : iconClassName}`}
            />
          </button>
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
          <button onClick={toggleShowHelp} title="Toggle Help Text">
            <QuestionMarkCircleIcon
              className={`${$showHelp ? "-rotate-6 w-8 h-8 text-white rounded bg-myblue p-1" : iconClassName}`}
            />
          </button>
        </div>
      )}

      {!isDemoMode && showSaveModal && (
        <SaveModal
          nodeId={nodeId}
          onClose={() => setShowSaveModal(false)}
          onSaveComplete={handleSaveComplete}
        />
      )}

      {isDemoMode && $viewportKey.value === `mobile` ? (
        <ShieldExclamationIcon
          className="w-8 h-8 text-myorange cursor-not-allowed"
          title="Demo Mode; no changes will be saved!"
        />
      ) : (
        isDemoMode && (
          <div
            className="h-9 px-3 bg-myorange/20 text-myblack text-md rounded shadow-sm border border-myorange border-dotted flex items-center gap-1"
            title="No changes will be saved. Reload to reset and start over."
          >
            <span className="font-bold">Demo Mode</span>
          </div>
        )
      )}
    </div>
  );
};

export default StoryKeepHeader;
