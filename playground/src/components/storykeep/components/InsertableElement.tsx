import { memo } from "react";
import {
  DraggableElement,
  type DraggableElementProps,
} from "@/components/storykeep/components/DraggableElement.tsx";
import { toolAddModesIcons } from "@/constants.ts";

export const InsertableElement = memo((props: DraggableElementProps) => {
  return (
    <DraggableElement el={props.el} onClicked={props.onClicked}>
      <button className="mx-1">
        <img
          draggable={false}
          width={32}
          height={32}
          src={`/editor/icons/${toolAddModesIcons[props.el]}`}
        />
      </button>
    </DraggableElement>
  );
});