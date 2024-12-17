import { memo } from "react";
import { toolAddModesIcons } from "@/constants.ts";
import type { ToolAddMode } from "@/types.ts";
import {
  type DraggableElementProps,
  InsertDraggableElement,
} from "@/components/storykeep/panes/InsertDraggableElement.tsx";

export const InsertableElement = memo((props: DraggableElementProps) => {
  const elType: ToolAddMode | undefined = props?.el || undefined;
  const iconName: string = elType ? toolAddModesIcons[elType] : "";

  return (
    <InsertDraggableElement el={props.el} onClicked={props.onClicked}>
      <button className="mx-1">
        <img draggable={false} width={32} height={32} src={`/editor/icons/${iconName}`} />
      </button>
    </InsertDraggableElement>
  );
});
