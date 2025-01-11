import type { Dispatch, SetStateAction } from "react";
import { StoryFragmentMode, type StoryFragmentModeType } from "@/types.ts";

interface StoryFragmentMenuPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<StoryFragmentModeType>>;
}

const StoryFragmentMenuPanel = ({ nodeId, setMode }: StoryFragmentMenuPanelProps) => {
  return (
      <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
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
          Story Fragment Menu
        </div>
      </div>
  );
};

export default StoryFragmentMenuPanel;
