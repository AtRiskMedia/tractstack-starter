import type { Dispatch, SetStateAction } from "react";
import { StoryFragmentMode, type StoryFragmentModeType } from "@/types.ts";

interface StoryFragmentOgPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<StoryFragmentModeType>>;
}

const StoryFragmentOgPanel = ({ nodeId, setMode }: StoryFragmentOgPanelProps) => {
  return (
    <div className="mb-4">
      <div className="p-1.5 bg-white rounded-b-md w-full group">
        <div className="px-3.5">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-bold">Configure Web Page</h3>
            <button
              onClick={() => setMode(StoryFragmentMode.DEFAULT)}
              className="text-myblue hover:text-black"
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
