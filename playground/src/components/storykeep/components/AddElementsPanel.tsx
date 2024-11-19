import { memo } from "react";
import { toolAddModes, toolAddModesIcons } from "@/constants.ts";
import type { ToolAddMode, ToolMode } from "@/types.ts";
import { InsertableElement } from "@/components/storykeep/components/InsertableElement.tsx";
import { MiscElementsDropdown } from "@/components/storykeep/components/MiscElementsDropdown.tsx";

export type AddElementsPanelProps = {
  toolAddMode: ToolAddMode;

  setToolMode: (toolMode: ToolMode) => void;
  setToolAddMode: (newToolAddMode: ToolAddMode) => void;
};

export const AddElementsPanel = memo((props: AddElementsPanelProps) => {
  const setMode = (mode: ToolAddMode) => {
    if (props.setToolAddMode) {
      props.setToolAddMode(mode);
    }
    if (props.setToolMode) {
      props.setToolMode("insert");
    }
  };

  const onInsertableModeClicked = (mode: ToolAddMode) => {
    setMode(mode);
  };

  const canSpawnIcon = (mode: ToolAddMode) => {
    if (toolAddModesIcons[mode]?.length === 0) return false;
    return true;
  };

  return (
    <div className="flex items-center">
      {toolAddModes.filter(canSpawnIcon).map((mode) => (
        <InsertableElement el={mode} onClicked={onInsertableModeClicked} />
      ))}

      <MiscElementsDropdown onClickedOption={onInsertableModeClicked}/>
    </div>
  );
});
