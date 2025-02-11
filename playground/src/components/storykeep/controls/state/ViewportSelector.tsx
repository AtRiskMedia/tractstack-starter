import DevicePhoneMobileIcon from "@heroicons/react/24/outline/DevicePhoneMobileIcon";
import DeviceTabletIcon from "@heroicons/react/24/outline/DeviceTabletIcon";
import ComputerDesktopIcon from "@heroicons/react/24/outline/ComputerDesktopIcon";
import ViewfinderCircleIcon from "@heroicons/react/24/outline/ViewfinderCircleIcon";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes.ts";
import type { ViewportAuto, ViewportKey } from "@/types";

interface ViewportSelectorProps {
  viewportKey: ViewportAuto;
  viewport: ViewportKey;
  auto: boolean;
  setViewport: (viewport: "auto" | "mobile" | "tablet" | "desktop") => void;
}

const ViewportSelector = ({ viewport, viewportKey, auto, setViewport }: ViewportSelectorProps) => {
  const classNames = (...classes: string[]) => classes.filter(Boolean).join(" ");
  const viewportButtons = [
    {
      key: "auto",
      Icon: ViewfinderCircleIcon,
      title: "Responsive view (default)",
    },
    {
      key: "mobile",
      Icon: DevicePhoneMobileIcon,
      title: "Mobile or small screens",
    },
    {
      key: "tablet",
      Icon: DeviceTabletIcon,
      title: "Tablet or medium screens",
    },
    {
      key: "desktop",
      Icon: ComputerDesktopIcon,
      title: "Desktop or large screens",
    },
  ] as const;

  return (
    <div className="flex items-center">
      <div>
        <span className={`mr-1 text-sm text-mydarkgrey`}>Designing for:</span>
        <span className={`font-bold text-xl text-myblue pr-2.5`}>
          {!auto ? viewport : viewportKey}
        </span>
      </div>
      <span className="isolate inline-flex -space-x-px rounded-md shadow-sm">
        {viewportButtons.map(({ key, Icon, title }, index) => (
          <button
            key={key}
            type="button"
            title={title}
            className={classNames(
              "hover:bg-myorange/50 hover:text-black",
              (key === `auto` && auto) || (viewport === key && !auto)
                ? "bg-myblue text-white"
                : "bg-mylightgrey/20 text-mydarkgrey ring-1 ring-inset ring-slate-200 focus:z-10",
              "relative inline-flex items-center px-3 py-2",
              index === 0 ? "rounded-l-md" : "",
              index === viewportButtons.length - 1 ? "rounded-r-md" : ""
            )}
            onClick={() => {
              setViewport(key);
              getCtx().notifyNode(ROOT_NODE_NAME);
            }}
          >
            <span className="sr-only">{key}</span>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        ))}
      </span>
    </div>
  );
};

export default ViewportSelector;
