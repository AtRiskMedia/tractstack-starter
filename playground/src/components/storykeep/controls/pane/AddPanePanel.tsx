import { useStore } from "@nanostores/react";
import { settingsPanelStore, keyboardAccessible } from "@/store/storykeep.ts";
import AddPaneNewPanel from "./AddPanePanel_new";
import AddPaneBreakPanel from "./AddPanePanel_break";
import AddPaneReUsePanel from "./AddPanePanel_reuse";
import AddPaneCodeHookPanel from "./AddPanePanel_codehook";
import { NodesContext } from "@/store/nodes";
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
  const lookup = first ? `${nodeId}-0` : nodeId;
  const $mode = typeof ctx !== `undefined` ? useStore(ctx.paneAddMode) : null;
  const mode = $mode ? $mode[lookup] : PaneAddMode.DEFAULT;

  const setMode = (newMode: PaneAddMode) => {
    ctx?.setPaneAddMode(lookup, newMode);
    settingsPanelStore.set(null);
  };

  if (mode === PaneAddMode.NEW) {
    return (
      <AddPaneNewPanel
        nodeId={nodeId}
        first={first}
        setMode={setMode}
        ctx={ctx}
        isStoryFragment={isStoryFragment}
        isContextPane={isContextPane}
      />
    );
  } else if (mode === PaneAddMode.BREAK && !isContextPane) {
    return (
      <AddPaneBreakPanel
        nodeId={nodeId}
        first={first}
        setMode={setMode}
        ctx={ctx}
        isStoryFragment={isStoryFragment}
      />
    );
  } else if (mode === PaneAddMode.REUSE && !isContextPane) {
    return <AddPaneReUsePanel nodeId={nodeId} first={first} setMode={setMode} />;
  } else if (mode === PaneAddMode.CODEHOOK) {
    return (
      <AddPaneCodeHookPanel
        nodeId={nodeId}
        first={first}
        setMode={setMode}
        isStoryFragment={isStoryFragment}
        isContextPane={isContextPane}
      />
    );
  }

  return (
    <div className="px-0.5 py-0.5 bg-mylightgrey">
      <div className="p-0.5 bg-gray-300 flex gap-1 w-full group rounded-md">
        <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
          Insert Pane Here
        </div>
        <div
          className={`flex gap-1 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity`}
        >
          <button
            onClick={() => setMode(PaneAddMode.NEW)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            + Design New
          </button>
          {!isContextPane && (
            <>
              <button
                onClick={() => setMode(PaneAddMode.BREAK)}
                className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
              >
                + Visual Break
              </button>
              <button
                onClick={() => setMode(PaneAddMode.REUSE)}
                className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
              >
                + Re-use existing pane
              </button>
            </>
          )}
          <button
            onClick={() => setMode(PaneAddMode.CODEHOOK)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            + Custom Code Hook
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPanePanel;
