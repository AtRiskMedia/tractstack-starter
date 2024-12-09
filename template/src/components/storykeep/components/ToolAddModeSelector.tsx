import { forwardRef, type MouseEvent, useEffect, useRef, useState } from "react";
import { toolAddModeTitles, toolAddModes } from "../../../constants";
import type { ToolAddMode } from "../../../types";
import Draggable, { type ControlPosition } from "react-draggable";
import {
  dragHandleStore,
  dropDraggingElement,
  resetDragStore,
  setDragPosition,
  setGhostBlockHeight,
} from "../../../store/storykeep.ts";

interface ToolAddModeSelectorProps {
  toolAddMode: ToolAddMode;
  setToolAddMode: (toolAddMode: ToolAddMode) => void;
}

const ToolAddModeSelector = forwardRef<
  HTMLSelectElement,
  ToolAddModeSelectorProps
>(({ toolAddMode, setToolAddMode }, ref) => {
  const [dragPos, setDragPos] = useState<ControlPosition>({x: 0, y: 0})
  const dragging = useRef<boolean>(false);
  const domRef = useRef(null);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setToolAddMode(event.target.value as ToolAddMode);
  };

  useEffect(() => {
    const handleMouseMove: EventListener = (event) => {
      const mouseEvent = event as unknown as MouseEvent; // Type assertion to MouseEvent
      const x = mouseEvent.clientX + window.scrollX;
      const y = mouseEvent.clientY + window.scrollY;
      if(dragging.current) {
        setDragPosition({x, y});
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      // reset drag here again because some modes can not trigger draggable onStop
      resetDragStore();
    }
  }, []);

  return (
    <div className="flex items-center">
      <label
        htmlFor="toolAddMode"
        className="mr-2 text-sm font-bold text-mydarkgrey"
      >
        Add:
      </label>
      <select
        ref={ref}
        id="toolAddMode"
        name="toolAddMode"
        value={toolAddMode}
        onChange={handleChange}
        className="w-fit-contents block rounded-md border-0 py-1.5 pl-3 pr-10 text-mydarkgrey ring-1 ring-inset ring-mylightgrey focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
      >
        {toolAddModes.map(mode => (
          <option key={mode} value={mode}>
            {toolAddModeTitles[mode]}
          </option>
        ))}
      </select>
    </div>
  );
});

export default ToolAddModeSelector;
