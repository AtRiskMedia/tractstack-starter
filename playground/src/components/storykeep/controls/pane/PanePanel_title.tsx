import type { Dispatch, SetStateAction } from "react";
import { PaneMode } from "./ConfigPanePanel";

interface PaneTitlePanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const PaneTitlePanel = ({ nodeId, setMode }: PaneTitlePanelProps) => {
  console.log(nodeId);
  return (
    <div className="p-0.5 shadow-inner">
      <div className="flex flex-col gap-2 mb-1.5">
        <div className="p-1.5 bg-white rounded-md flex gap-1 w-full">
          <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">Pane Title</div>
        </div>
        <button
          onClick={() => setMode(PaneMode.DEFAULT)}
          className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
};

export default PaneTitlePanel;
