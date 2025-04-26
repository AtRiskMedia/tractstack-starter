import { useState } from "react";
import { useStore } from "@nanostores/react";
import { settingsPanelStore, keyboardAccessible } from "@/store/storykeep.ts";
import AddPaneNewPanel from "./AddPanePanel_new";
import AddPaneBreakPanel from "./AddPanePanel_break";
import AddPaneReUsePanel from "./AddPanePanel_reuse";
import AddPaneCodeHookPanel from "./AddPanePanel_codehook";
import { NodesContext, ROOT_NODE_NAME } from "@/store/nodes";
import { PaneAddMode } from "@/types";

interface AddPanePanelProps {
  nodeId: string;
  first?: boolean;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
}

const AddPanePanel = ({
  nodeId,
  first = false,
  ctx,
  isStoryFragment = false,
  isContextPane = false,
}: AddPanePanelProps) => {
  const [reset, setReset] = useState(false);
  const lookup = first ? `${nodeId}-0` : nodeId;

  const nodesCtx = typeof ctx !== `undefined` ? ctx : null;
  const activePaneMode = typeof ctx !== `undefined` ? useStore(ctx.activePaneMode) : null;
  const hasPanes = typeof ctx !== `undefined` ? useStore(ctx.hasPanes) : false;
  const isActive = activePaneMode?.panel === "add" && activePaneMode?.paneId === lookup;
  const isTemplate = typeof ctx !== `undefined` ? useStore(ctx.isTemplate) : false;

  const mode =
    isActive && activePaneMode?.mode
      ? (activePaneMode?.mode as PaneAddMode)
      : !hasPanes && first && !reset
        ? PaneAddMode.NEW
        : PaneAddMode.DEFAULT;

  const setMode = (newMode: PaneAddMode, reset?: boolean) => {
    setReset(true);
    nodesCtx?.setPanelMode(lookup, "add", newMode);
    if (reset) nodesCtx?.notifyNode(ROOT_NODE_NAME);
    settingsPanelStore.set(null);
  };

  // Always render a stable container div for the intersection observer
  return (
    <div className="add-pane-panel-wrapper">
      {mode === PaneAddMode.NEW || (!hasPanes && first && !reset) ? (
        <AddPaneNewPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          ctx={ctx}
          isStoryFragment={isStoryFragment}
          isContextPane={isContextPane}
        />
      ) : mode === PaneAddMode.BREAK && !isContextPane ? (
        <AddPaneBreakPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          ctx={ctx}
          isStoryFragment={isStoryFragment}
        />
      ) : mode === PaneAddMode.REUSE && !isContextPane ? (
        <AddPaneReUsePanel nodeId={nodeId} first={first} setMode={setMode} />
      ) : mode === PaneAddMode.CODEHOOK ? (
        <AddPaneCodeHookPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          isStoryFragment={isStoryFragment}
          isContextPane={isContextPane}
        />
      ) : (
        <div className="border-t border-dotted border-mylightgrey">
          <div className="px-1.5 pt-1.5 pb-0.5 flex gap-1 w-full group">
            <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
              Insert Pane Here
            </div>
            <div
              className={`flex gap-1 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity`}
            >
              <button
                onClick={() => setMode(PaneAddMode.NEW)}
                className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors"
              >
                + Design New
              </button>
              {!isContextPane && (
                <>
                  <button
                    onClick={() => setMode(PaneAddMode.BREAK)}
                    className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors"
                  >
                    + Visual Break
                  </button>
                  {!isTemplate && (
                    <button
                      onClick={() => setMode(PaneAddMode.REUSE)}
                      className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors"
                    >
                      + Re-use existing pane
                    </button>
                  )}
                </>
              )}
              {!isTemplate && (
                <button
                  onClick={() => setMode(PaneAddMode.CODEHOOK)}
                  className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors"
                >
                  + Custom Code Hook
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPanePanel;
