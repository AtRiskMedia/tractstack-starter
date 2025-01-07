// Update to StoryKeepHeader.tsx
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import ArrowUturnLeftIcon from "@heroicons/react/24/outline/ArrowUturnLeftIcon";
import ArrowUturnRightIcon from "@heroicons/react/24/outline/ArrowUturnRightIcon";
import CogIcon from "@heroicons/react/24/outline/CogIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import BugAntIcon from "@heroicons/react/24/outline/BugAntIcon";
import {
  showAnalytics,
  showSettings,
  viewportStore,
  viewportKeyStore,
  viewportSetStore,
  settingsPanelStore,
} from "../../../store/storykeep";
import ViewportSelector from "../header/ViewportSelector";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes.ts";

const offset = 64 + 16 + 16;
const getViewportFromWidth = (width: number): "mobile" | "tablet" | "desktop" => {
  if (width >= 1368 + offset) return "desktop";
  if (width >= 801 + offset) return "tablet";
  return "mobile";
};

const StoryKeepHeader = () => {
  const $viewportSet = useStore(viewportSetStore);
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const $showAnalytics = useStore(showAnalytics);
  const $showSettings = useStore(showSettings);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const updateUndoRedo = () => {
      setCanUndo(getCtx().history.canUndo());
      setCanRedo(getCtx().history.canRedo());
      console.log("undo/redo update");
    };

    getCtx().history.headIndex.listen(() => {
      updateUndoRedo();
    });
    getCtx().history.history.listen(() => {
      updateUndoRedo();
    });
  }, []);

  useEffect(() => {
    const updateViewportKey = () => {
      if (!$viewportSet && $viewport.value === "auto") {
        const newViewportKey = getViewportFromWidth(window.innerWidth);
        if (newViewportKey !== $viewportKey.value) {
          viewportKeyStore.set({ value: newViewportKey });
        }
      }
    };

    updateViewportKey();
    window.addEventListener("resize", updateViewportKey);
    return () => window.removeEventListener("resize", updateViewportKey);
  }, [$viewportSet, $viewport.value, $viewportKey.value]);

  const setViewport = (newViewport: "auto" | "mobile" | "tablet" | "desktop") => {
    const isAuto = newViewport === "auto";
    viewportSetStore.set(!isAuto);
    viewportStore.set({ value: newViewport });

    const newViewportKey = isAuto ? getViewportFromWidth(window.innerWidth) : newViewport;
    viewportKeyStore.set({ value: newViewportKey });
  };

  const showDebugPanel = () => {
    settingsPanelStore.set({ nodeId: ``, action: `debug` });
  };

  const iconClassName =
    "w-6 h-6 text-myblue hover:text-white hover:bg-myblue rounded-xl hover:rounded bg-white";
  const iconActiveClassName = "-rotate-6 w-6 h-6 text-white rounded bg-myblue";

  return (
    <div className="p-2 flex flex-wrap justify-center items-center gap-y-2 gap-x-6">
      <ViewportSelector
        viewport={$viewport.value}
        viewportKey={$viewportKey.value}
        auto={!$viewportSet}
        setViewport={setViewport}
      />

      <div className="flex items-center gap-2">
        <ArrowUturnLeftIcon
          title="Undo"
          style={{ visibility: canUndo ? "visible" : "hidden" }}
          className={iconClassName}
          onClick={() => {
            getCtx().history.undo();
            getCtx().notifyNode(ROOT_NODE_NAME);
          }}
        />
        <ArrowUturnRightIcon
          title="Redo"
          style={{ visibility: canRedo ? "visible" : "hidden" }}
          className={iconClassName}
          onClick={() => {
            getCtx().history.redo();
            getCtx().notifyNode(ROOT_NODE_NAME);
          }}
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="bg-white text-myblue hover:underline font-action font-bold">Save</button>
        <button className="bg-white text-myblue hover:underline font-action font-bold">
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setTimeout(() => {
              const pageSettings = document.getElementById("page-settings");
              if (!pageSettings) return;
              const rect = pageSettings.getBoundingClientRect();
              const viewportHeight = window.innerHeight;
              const isInView = rect.top >= 0 && rect.bottom <= viewportHeight;
              if (!isInView) {
                const scrollTop = window.scrollY + rect.top - (viewportHeight - rect.height) / 2;
                window.scrollTo({
                  top: scrollTop,
                  behavior: "smooth",
                });
              }
            }, 500);
            showSettings.set(!$showSettings);
          }}
          title="Advanced Settings"
        >
          <CogIcon className={`${$showSettings ? iconActiveClassName : iconClassName}`} />
        </button>
        <button
          onClick={() => showAnalytics.set(!$showAnalytics)}
          title="Toggle Interaction Analytics"
        >
          <PresentationChartBarIcon
            className={`${$showAnalytics ? iconActiveClassName : iconClassName}`}
          />
        </button>
        {import.meta.env.DEV ? (
          <button onClick={() => showDebugPanel()} title="Reveal Debug Panel">
            <BugAntIcon className={iconClassName} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default StoryKeepHeader;
