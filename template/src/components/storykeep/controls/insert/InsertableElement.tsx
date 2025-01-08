import { memo } from "react";
import { toolAddModesIcons } from "@/constants.ts";
import type { ToolAddMode } from "@/types.ts";
import { type DraggableElementProps, InsertDraggableElement } from "./InsertDraggableElement.tsx";

interface InsertableElementProps extends DraggableElementProps {
  currentToolAddMode: ToolAddMode;
}

export const InsertableElement = memo((props: InsertableElementProps) => {
  const elType: ToolAddMode | undefined = props?.el || undefined;
  const iconName: string = elType ? toolAddModesIcons[elType] : "";
  const isActive = props.currentToolAddMode === props.el;

  return (
    <InsertDraggableElement el={props.el} onClicked={props.onClicked}>
      <button
        className={`mx-1 p-1 rounded ${isActive ? "bg-slate-200 shadow-inner" : "hover:bg-gray-100"}`}
      >
        <img draggable={false} width={32} height={32} src={`/icons/${iconName}`} />
      </button>
    </InsertDraggableElement>
  );
});
