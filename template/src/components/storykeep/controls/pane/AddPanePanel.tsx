import { useState, useEffect } from "react";
import { keyboardAccessible } from "@/store/storykeep.ts";
import AddPaneNewPanel from "./AddPanePanel_new";
import AddPaneBreakPanel from "./AddPanePanel_break";
import AddPaneReUsePanel from "./AddPanePanel_reuse";
import AddPaneCodeHookPanel from "./AddPanePanel_codehook";

export enum PaneMode {
  DEFAULT = "DEFAULT",
  NEW = "NEW",
  BREAK = "BREAK",
  REUSE = "REUSE",
  CODEHOOK = "CODEHOOK",
}

interface AddPanePanelProps {
  nodeId: string;
  first?: boolean;
}

const AddPanePanel = ({ nodeId, first = false }: AddPanePanelProps) => {
  const [mode, setMode] = useState<PaneMode>(PaneMode.DEFAULT);

  useEffect(() => {
    setMode(PaneMode.DEFAULT);
  }, [nodeId]);

  if (mode === PaneMode.NEW) {
    return <AddPaneNewPanel nodeId={nodeId} first={first} setMode={setMode} />;
  } else if (mode === PaneMode.BREAK) {
    return <AddPaneBreakPanel nodeId={nodeId} first={first} setMode={setMode} />;
  } else if (mode === PaneMode.REUSE) {
    return <AddPaneReUsePanel nodeId={nodeId} first={first} setMode={setMode} />;
  } else if (mode === PaneMode.CODEHOOK) {
    return <AddPaneCodeHookPanel nodeId={nodeId} first={first} setMode={setMode} />;
  }

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">Insert Pane</div>
        <div className={`flex gap-1 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity`}>
          <button
            onClick={() => setMode(PaneMode.NEW)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            + Design New
          </button>
          <button
            onClick={() => setMode(PaneMode.BREAK)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            + Visual Break
          </button>
          <button
            onClick={() => setMode(PaneMode.REUSE)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            + Re-use existing pane
          </button>
          <button
            onClick={() => setMode(PaneMode.CODEHOOK)}
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
