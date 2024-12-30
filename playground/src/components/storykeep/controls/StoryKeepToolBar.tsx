import { editModeStore, toolModeStore, toolAddModeStore } from "../../../store/storykeep";
import { AddElementsPanel } from "@/components/storykeep/panes/AddElementsPanel.tsx";
import type { ToolMode, ToolAddMode } from "../../../types";

const StoryKeepToolBar = () => {
  const setToolMode = (newToolMode: ToolMode) => {
    editModeStore.set(null);
    toolModeStore.set({ value: newToolMode });
  };
  const setToolAddMode = (newToolAddMode: ToolAddMode) => {
    toolAddModeStore.set({ value: newToolAddMode });
  };

  return <AddElementsPanel setToolAddMode={setToolAddMode} setToolMode={setToolMode} />;
};

export default StoryKeepToolBar;
