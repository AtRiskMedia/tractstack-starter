import type { Dispatch, SetStateAction } from "react";
import { StoryFragmentMode } from "./StoryFragmentConfigPanel";

interface StoryFragmentTitlePanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<StoryFragmentMode>>;
}

const StoryFragmentTitlePanel = ({ nodeId, setMode }: StoryFragmentTitlePanelProps) => {
  console.log(nodeId);
  return (
    <div className="p-0.5 shadow-inner">
      <div className="flex flex-col gap-2 mb-1.5">
        <div className="p-1.5 bg-white rounded-md flex gap-1 w-full">
          <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
            Story Fragment Title
          </div>
        </div>
        <button
          onClick={() => setMode(StoryFragmentMode.DEFAULT)}
          className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
};

export default StoryFragmentTitlePanel;
