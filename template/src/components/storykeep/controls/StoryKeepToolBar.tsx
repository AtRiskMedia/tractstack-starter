import {
  settingsPanelStore,
  toolModeStore,
  toolAddModeStore,
  toolModeValStore,
} from "../../../store/storykeep";
import { AddElementsPanel } from "./insert/AddElementsPanel.tsx";
import { useStore } from "@nanostores/react";
import type { ToolMode, ToolAddMode } from "../../../types";

const StoryKeepToolBar = () => {
  const { value: toolModeVal } = useStore(toolModeValStore);
  const { value: toolAddModeVal } = useStore(toolAddModeStore);
  const setToolMode = (newToolMode: ToolMode) => {
    settingsPanelStore.set(null);
    toolModeStore.set({ value: newToolMode });
  };
  const setToolAddMode = (newToolAddMode: ToolAddMode) => {
    toolAddModeStore.set({ value: newToolAddMode });
  };

  if (toolModeVal !== "insert") {
    return null;
  }

  return (
    <div className="w-auto bg-mywhite rounded-tr-md shadow-lg">
      <div className="flex flex-wrap gap-x-2 gap-y-1 p-0.5 drop-shadow">
        <AddElementsPanel
          setToolAddMode={setToolAddMode}
          setToolMode={setToolMode}
          currentToolAddMode={toolAddModeVal}
        />
      </div>
    </div>
  );
};

export default StoryKeepToolBar;
