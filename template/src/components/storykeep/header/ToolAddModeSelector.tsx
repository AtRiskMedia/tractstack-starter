import { forwardRef } from "react";
import { toolAddModeTitles, toolAddModes } from "../../../constants";
import type { ToolAddMode } from "../../../types";

interface ToolAddModeSelectorProps {
  toolAddMode: ToolAddMode;
  setToolAddMode: (toolAddMode: ToolAddMode) => void;
}

const ToolAddModeSelector = forwardRef<HTMLSelectElement, ToolAddModeSelectorProps>(
  ({ toolAddMode, setToolAddMode }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      setToolAddMode(event.target.value as ToolAddMode);
    };

    return (
      <div className="flex items-center">
        <label htmlFor="toolAddMode" className="mr-2 text-sm font-bold text-mydarkgrey">
          Add:
        </label>
        <select
          ref={ref}
          id="toolAddMode"
          name="toolAddMode"
          value={toolAddMode}
          onChange={handleChange}
          className="block w-fit-contents rounded-md border-0 py-1.5 pl-3 pr-10 text-mydarkgrey ring-1 ring-inset ring-mylightgrey focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
        >
          {toolAddModes.map((mode) => (
            <option key={mode} value={mode}>
              {toolAddModeTitles[mode]}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

export default ToolAddModeSelector;
