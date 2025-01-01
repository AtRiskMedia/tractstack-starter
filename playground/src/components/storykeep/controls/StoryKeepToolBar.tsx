import {
  editModeStore,
  toolModeStore,
  toolAddModeStore,
  toolModeValStore,
} from "../../../store/storykeep";
import { AddElementsPanel } from "@/components/storykeep/panes/AddElementsPanel.tsx";
import { useStore } from "@nanostores/react";
import type { ToolMode, ToolAddMode } from "../../../types";

const StoryKeepToolBar = () => {
  const { value: toolModeVal } = useStore(toolModeValStore);
  const setToolMode = (newToolMode: ToolMode) => {
    editModeStore.set(null);
    toolModeStore.set({ value: newToolMode });
  };
  const setToolAddMode = (newToolAddMode: ToolAddMode) => {
    toolAddModeStore.set({ value: newToolAddMode });
  };

  if (toolModeVal !== "insert") {
    return null;
  }

  return (
    <div
      id="toolsPanel"
      className="fixed left-0 md:ml-16 w-auto bg-mywhite rounded-r-lg mt-0.5 shadow-lg z-30"
    >
      <div className="bg-mygreen/10">
        <div className="flex flex-wrap gap-x-2 gap-y-1 p-1 drop-shadow">
          <AddElementsPanel setToolAddMode={setToolAddMode} setToolMode={setToolMode} />
        </div>
      </div>
    </div>
  );
};

export default StoryKeepToolBar;
