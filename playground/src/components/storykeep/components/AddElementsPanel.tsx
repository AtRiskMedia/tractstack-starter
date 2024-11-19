import { memo } from "react";
import { toolAddModes, toolAddModesIcons } from "@/constants.ts";
import { InsertableElement } from "@/components/storykeep/components/InsertableElement.tsx";
import type { ToolAddMode, ToolMode } from "@/types.ts";

export type AddElementsPanelProps = {
  setToolMode: (toolMode: ToolMode) => void;
  setToolAddMode: (newToolAddMode: ToolAddMode) => void;
}

export const AddElementsPanel = memo((props: AddElementsPanelProps) => {
  const onInsertableModeClicked = (mode: ToolAddMode) => {
    if(props.setToolAddMode) {
      props.setToolAddMode(mode);
    }
    if(props.setToolMode) {
      props.setToolMode("insert");
    }
  }

  const canSpawnIcon = (mode: ToolAddMode) => {
    if(toolAddModesIcons[mode]?.length === 0)
      return false;
    return true;
  }

  return (
    <div className="flex items-center">
      {toolAddModes.filter(canSpawnIcon)
                   .map(mode =>
                     <InsertableElement el={mode} onClicked={onInsertableModeClicked} />
                   )
      }
    </div>
  );
});