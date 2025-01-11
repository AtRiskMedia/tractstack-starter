import type { Dispatch, SetStateAction } from "react";
import { StoryFragmentMode, type StoryFragmentModeType } from "@/types.ts";

interface StoryFragmentOgPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<StoryFragmentModeType>>;
}

const StoryFragmentOgPanel = ({ nodeId, setMode }: StoryFragmentOgPanelProps) => {
  return (
    <div className="p-3.5 mb-4">
      <div className="p-1.5 bg-white rounded-md w-full group">
        <div className="px-3.5">
          <div className="flex justify-between">
            <h3 className="text-lg font-bold mb-4">Configure Web Page</h3>
            <button
              onClick={() => setMode(StoryFragmentMode.DEFAULT)}
              className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
            >
              ← Go Back
            </button>
          </div>
          OG Image
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentOgPanel;
