import { useState, useEffect } from "react";
import { keyboardAccessible } from "@/store/storykeep.ts";
import ArrowDownIcon from "@heroicons/react/24/outline/ArrowDownIcon";
//import AddPaneNewPanel from "./AddPanePanel_new";
//import AddPaneBreakPanel from "./AddPanePanel_break";
//import AddPaneReUsePanel from "./AddPanePanel_reuse";
//import AddPaneCodeHookPanel from "./AddPanePanel_codehook";

export enum PaneMode {
  DEFAULT = "DEFAULT",
  //CODEHOOK = "CODEHOOK",
}

interface ConfigPanePanelProps {
  nodeId: string;
}

const ConfigPanePanel = ({ nodeId }: ConfigPanePanelProps) => {
  const [mode, setMode] = useState<PaneMode>(PaneMode.DEFAULT);

  useEffect(() => {
    setMode(PaneMode.DEFAULT);
  }, [nodeId]);

  //if (mode === PaneMode.NEW) {
  //  return <AddPaneNewPanel nodeId={nodeId} first={first} setMode={setMode} />;
  //} else if (mode === PaneMode.BREAK) {
  //  return <AddPaneBreakPanel nodeId={nodeId} first={first} setMode={setMode} />;
  //} else if (mode === PaneMode.REUSE) {
  //  return <AddPaneReUsePanel nodeId={nodeId} first={first} setMode={setMode} />;
  //} else if (mode === PaneMode.CODEHOOK) {
  //  return <AddPaneCodeHookPanel nodeId={nodeId} first={first} setMode={setMode} />;
  //}

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
          {" "}
          <ArrowDownIcon className="w-6 h-6 inline-block" /> This Pane
        </div>
        <div
          className={`flex gap-1 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity`}
        >
          <button
            onClick={() => setMode(PaneMode.DEFAULT)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            placeholder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanePanel;
