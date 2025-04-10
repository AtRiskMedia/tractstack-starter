import { memo } from "react";
import { toolAddModes, toolAddModesIcons } from "@/constants.ts";
import type { ToolAddMode, ToolModeVal } from "@/types.ts";
import { InsertableElement } from "./InsertableElement.tsx";
import { MiscElementsDropdown } from "./MiscElementsDropdown.tsx";

export type AddElementsPanelProps = {
  setToolMode: (toolMode: ToolModeVal) => void;
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
    <div className="flex flex-col ml-3 p-2.5 z-20">
      <div className="flex items-center">
        {toolAddModes.filter(canSpawnIcon).map((mode, idx) => (
          <InsertableElement
            el={mode}
            key={idx}
            onClicked={onInsertableModeClicked}
            currentToolAddMode={props.currentToolAddMode}
          />
        ))}

        <MiscElementsDropdown
          onClickedOption={onInsertableModeClicked}
          currentToolAddMode={props.currentToolAddMode}
        />
      </div>
      <p className="text-sm mt-1.5 text-mydarkgrey">
        <em>Drag and drop coming soon!</em>
      </p>
    </div>
  );
});
