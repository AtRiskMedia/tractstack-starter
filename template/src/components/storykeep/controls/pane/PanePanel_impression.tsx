import type { Dispatch, SetStateAction } from "react";
import { PaneMode } from "./ConfigPanePanel";

interface PaneImpressionPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const PaneImpressionPanel = ({ nodeId, setMode }: PaneImpressionPanelProps) => {
  console.log(nodeId);
  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Impression</h3>
          <button
            onClick={() => setMode(PaneMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="relative">...</div>
      </div>
    </div>
  );
};

export default PaneImpressionPanel;
