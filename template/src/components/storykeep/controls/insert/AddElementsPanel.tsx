import { memo } from "react";
import { toolAddModes, toolAddModesIcons } from "@/constants.ts";
import type { ToolAddMode, ToolMode } from "@/types.ts";
import { InsertableElement } from "./InsertableElement.tsx";
import { MiscElementsDropdown } from "./MiscElementsDropdown.tsx";

export type AddElementsPanelProps = {
  setToolMode: (toolMode: ToolMode) => void;
  setToolAddMode: (newToolAddMode: ToolAddMode) => void;
  currentToolAddMode: ToolAddMode;
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
    <div className="ml-3 flex items-center">
      {toolAddModes.filter(canSpawnIcon).map((mode, idx) => (
        <InsertableElement
          el={mode}
          key={idx}
          onClicked={onInsertableModeClicked}
          currentToolAddMode={props.currentToolAddMode}
        />
      ))}

      <MiscElementsDropdown onClickedOption={onInsertableModeClicked} />
    </div>
  );
});
