import { useMemo } from "react";
import Cog6ToothIcon from "@heroicons/react/24/outline/Cog6ToothIcon";
import SelectedTailwindClass from "../fields/SelectedTailwindClass";
import { settingsPanelStore } from "@/store/storykeep";
import { isLinkNode } from "@/utils/nodes/type-guards";
import type { FlatNode } from "../../../../types";

interface StyleLinkPanelProps {
  node: FlatNode;
}

const StyleLinkPanel = ({ node }: StyleLinkPanelProps) => {
  if (!isLinkNode(node)) {
    return null;
  }

  const buttonPayload = node.buttonPayload;
  const buttonClasses = buttonPayload?.buttonClasses || {};
  const hoverClasses = buttonPayload?.buttonHoverClasses || {};

  // Transform classes into format expected by SelectedTailwindClass
  const mergedButtonClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    // Transform button classes - using single value for all viewports
    Object.entries(buttonClasses).forEach(([className, values]) => {
      result[className] = {
        mobile: values[0] || "",
      };
    });

    return result;
  }, [buttonClasses]);

  const mergedHoverClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    // Transform hover classes - using single value for all viewports
    Object.entries(hoverClasses).forEach(([className, values]) => {
      result[className] = {
        mobile: values[0] || "",
      };
    });

    return result;
  }, [hoverClasses]);

  const handleButtonStyleAdd = () => {
    settingsPanelStore.set({
      action: "style-link-add",
      nodeId: node.id,
    });
  };

  const handleHoverStyleAdd = () => {
    settingsPanelStore.set({
      action: "style-link-add-hover",
      nodeId: node.id,
    });
  };

  const handleButtonStyleRemove = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-remove",
      nodeId: node.id,
      className,
    });
  };

  const handleHoverStyleRemove = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-remove-hover",
      nodeId: node.id,
      className,
    });
  };

  const handleButtonStyleUpdate = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-update",
      nodeId: node.id,
      className,
    });
  };

  const handleHoverStyleUpdate = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-update-hover",
      nodeId: node.id,
      className,
    });
  };

  const handleLinkConfig = () => {
    settingsPanelStore.set({
      action: "style-link-config",
      nodeId: node.id,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">
          Link {node.tagName === "button" ? "Button" : ""} Styles
        </h2>

        <div className="pb-2">
          <div className="text-myblack text-sm p-2 border border-slate-200 rounded w-fit hover:bg-mygreen/20">
            <div title="Configure this Link" className="font-bold flex items-center gap-2">
              <Cog6ToothIcon className="w-4 h-4" />
              <button onClick={handleLinkConfig}>Configure Link Settings</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold">Button Styles</h3>
          {Object.keys(mergedButtonClasses).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(mergedButtonClasses).map(([className, values]) => (
                <SelectedTailwindClass
                  key={className}
                  name={className}
                  values={values}
                  onRemove={handleButtonStyleRemove}
                  onUpdate={handleButtonStyleUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <em>No styles.</em>
            </div>
          )}

          <div className="space-y-4">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
              <li>
                <em>Actions:</em>
              </li>
              <li>
                <button
                  onClick={handleButtonStyleAdd}
                  className="text-myblue hover:text-black underline font-bold"
                >
                  Add Style
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold">Hover Styles</h3>

        {Object.keys(mergedHoverClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedHoverClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleHoverStyleRemove}
                onUpdate={handleHoverStyleUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <em>No styles.</em>
          </div>
        )}

        <div className="space-y-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
            <li>
              <em>Actions:</em>
            </li>
            <li>
              <button
                onClick={handleHoverStyleAdd}
                className="text-myblue hover:text-black underline font-bold"
              >
                Add Style
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StyleLinkPanel;
