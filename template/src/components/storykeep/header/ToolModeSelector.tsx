import type { ToolMode } from "../../../types";
import { toolModeButtons } from "../../../constants";

interface ToolModeSelectorProps {
  toolMode: ToolMode;
  setToolMode: (toolMode: ToolMode) => void;
  isContext: boolean;
}

const ToolModeSelector = ({ toolMode, setToolMode, isContext }: ToolModeSelectorProps) => {
  const classNames = (...classes: string[]) => classes.filter(Boolean).join(" ");

  return (
    <div>
      <div className="flex items-center">
        <span className={`mr-1 text-sm text-mydarkgrey`}>Mode:</span>
        <span className={`font-bold text-xl text-myblue pr-2.5`}>{toolMode}</span>
        <span className="isolate inline-flex -space-x-px rounded-md shadow-sm">
          {toolModeButtons
            .filter((k) => !(isContext && k.key === `pane`))
            .map(({ key, Icon, title }, index) => (
              <button
                key={key}
                type="button"
                title={title}
                className={classNames(
                  "hover:bg-myorange/50 hover:text-black",
                  toolMode === key
                    ? "bg-myblue text-white"
                    : "bg-mylightgrey/20 text-mydarkgrey ring-1 ring-inset ring-slate-200 focus:z-10",
                  "relative inline-flex items-center px-2 py-1.5 md:px-3 md:py-2",
                  index === 0 ? "rounded-l-md" : "",
                  index === toolModeButtons.length - 1 ? "rounded-r-md" : ""
                )}
                onClick={() => setToolMode(key)}
              >
                <span className="sr-only">{key}</span>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            ))}
        </span>
      </div>
    </div>
  );
};

export default ToolModeSelector;
