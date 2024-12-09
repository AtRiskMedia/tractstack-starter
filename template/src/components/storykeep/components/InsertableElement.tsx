import { memo } from "react";
import {
  InsertDraggableElement,
  type DraggableElementProps,
} from "@/components/storykeep/components/InsertDraggableElement.tsx";
import { toolAddModesIcons } from "@/constants.ts";
import type { ToolAddMode } from "@/types.ts";

export const InsertableElement = memo((props: DraggableElementProps) => {
  const elType: ToolAddMode|undefined = props?.el || undefined;
  const iconName: string = elType ? toolAddModesIcons[elType] : "";

  return (
    <InsertDraggableElement el={props.el} onClicked={props.onClicked}>
      <button className="mx-1">
        <img
          draggable={false}
          width={32}
          height={32}
          src={`/editor/icons/${iconName}`}
        />
      </button>
    </InsertDraggableElement>
  );
});