import { useEffect, useState } from "react";
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
import { NodesSerializer_Json } from "@/store/nodesSerializer_Json";
import ViewportSelector from "../header/ViewportSelector";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes.ts";

const offset = 64 + 16 + 16;
const getViewportFromWidth = (width: number): "mobile" | "tablet" | "desktop" => {
  if (width >= 1368 + offset) return "desktop";
  if (width >= 801 + offset) return "tablet";
  return "mobile";
};

const StoryKeepHeader = (props: { keyboardAccessibleEnabled: boolean; nodeId: string }) => {
  const keyboardAccessibleEnabled = props.keyboardAccessibleEnabled;
  const $viewportSet = useStore(viewportSetStore);
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const $showAnalytics = useStore(showAnalytics);
  const $keyboardAccessible = useStore(keyboardAccessible);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  console.log(canUndo);

  useEffect(() => {
    if (keyboardAccessibleEnabled && !$keyboardAccessible) keyboardAccessible.set(true);
  }, [keyboardAccessibleEnabled]);

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

  const handleSave = () => {
    console.log(`serializing nodes`);
    getCtx().rootNodeId.set(props.nodeId);
    const s = new NodesSerializer_Json();
    s.save(getCtx());
    console.log(`serializing nodes complete.`);
  };

  const iconClassName =
    "w-6 h-6 text-myblue hover:text-white hover:bg-myblue rounded-xl hover:rounded bg-white";
  const iconActiveClassName = "-rotate-6 w-6 h-6 text-white rounded bg-myblue p-0.5";

  return (
    <div className="p-2 flex flex-wrap justify-center items-center gap-y-2 gap-x-6">
      <ViewportSelector
        viewport={$viewport.value}
        viewportKey={$viewportKey.value}
        auto={!$viewportSet}
        setViewport={setViewport}
      />

      {(canUndo || canRedo) && (
        <div className="flex flex-wrap justify-center items-center gap-2">
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
      )}

      <div className="flex flex-wrap justify-center items-center gap-2">
        <button
          onClick={() => handleSave()}
          className="bg-white text-myblue hover:underline font-action font-bold"
        >
          Save
        </button>
        <button className="bg-white text-myblue hover:underline font-action font-bold">
          Cancel
        </button>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-2">
        <button
          onClick={() => {
            showAnalytics.set(!$showAnalytics);
            getCtx(props).toolModeValStore.set({ value: "default" });
            settingsPanelStore.set(null);
            getCtx(props).notifyNode(ROOT_NODE_NAME);
          }}
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
        {!keyboardAccessibleEnabled && (
          <button
            onClick={() => {
              keyboardAccessible.set(!$keyboardAccessible);
              getCtx().notifyNode(ROOT_NODE_NAME);
            }}
            title="Toggle Mobile/Keyboard Accessibility"
          >
            <CursorArrowRaysIcon
              className={`${$keyboardAccessible ? iconActiveClassName : iconClassName}`}
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default StoryKeepHeader;
