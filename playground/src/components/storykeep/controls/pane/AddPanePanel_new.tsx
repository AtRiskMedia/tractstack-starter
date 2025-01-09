import type { Dispatch, SetStateAction } from "react";
import { PaneMode } from "./AddPanePanel";

interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const AddPaneNewPanel = ({ nodeId, first, setMode }: AddPaneNewPanelProps) => {
  console.log(nodeId,first)
  return (
    <div className="p-0.5 shadow-inner">
      <div className="flex flex-col gap-2 mb-1.5">
        <div className="p-1.5 bg-white rounded-md flex gap-1 w-full">
          <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
            Design New Pane
          </div>
          <button className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
            + Placeholder 1
          </button>
          <button className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
            + Placeholder 2
          </button>
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

export default AddPaneNewPanel;
