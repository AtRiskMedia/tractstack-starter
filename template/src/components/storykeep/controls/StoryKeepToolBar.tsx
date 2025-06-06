import { useStore } from "@nanostores/react";
import { settingsPanelStore, toolModeStore, toolAddModeStore } from "@/store/storykeep.ts";
import { AddElementsPanel } from "./insert/AddElementsPanel.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { ToolModeVal, ToolAddMode } from "@/types.ts";

const StoryKeepToolBar = () => {
  const ctx = getCtx();
  const hasTitle = useStore(ctx.hasTitle);
  const hasPanes = useStore(ctx.hasPanes);
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const { value: toolAddModeVal } = useStore(toolAddModeStore);
  const setToolMode = (newToolMode: ToolModeVal) => {
    settingsPanelStore.set(null);
    toolModeStore.set({ value: newToolMode });
    ctx.notifyNode(`root`);
  };
  const setToolAddMode = (newToolAddMode: ToolAddMode) => {
    toolAddModeStore.set({ value: newToolAddMode });
    ctx.notifyNode(`root`);
  };

  if (toolModeVal !== "insert" || !hasTitle || !hasPanes) {
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
