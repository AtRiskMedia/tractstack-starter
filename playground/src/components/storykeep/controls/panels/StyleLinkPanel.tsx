import { useMemo } from "react";
import Cog6ToothIcon from "@heroicons/react/24/outline/Cog6ToothIcon";
import SelectedTailwindClass from "../fields/SelectedTailwindClass";
import { StylesMemory } from "../state/StylesMemory";
import { settingsPanelStore } from "@/store/storykeep";
import { isLinkNode } from "@/utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers";
import { getCtx } from "@/store/nodes";
import { processClassesForViewports } from "@/utils/nodes/reduceNodesClassNames";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode } from "@/types";

const getButtonStyleClasses = (style: ButtonStyle) => ({
  mobile: Object.entries(style).reduce(
    (acc, [key, values]) => {
      acc[key] = values[0];
      return acc;
    },
    {} as Record<string, string>
  ),
  tablet: {},
  desktop: {},
});

const addHoverPrefix = (str: string): string =>
  str
    .split(" ")
    .map((word) => `hover:${word}`)
    .join(" ");

type ButtonStyle = Record<string, string[]>;
type ButtonStylePair = [ButtonStyle, ButtonStyle];

const buttonStyleOptions = ["Plain text inline", "Fancy text inline", "Fancy button"];
const buttonStyleClasses: ButtonStylePair[] = [
  [
    {
      fontWEIGHT: ["bold"],
      textDECORATION: ["underline"],
      textUNDERLINEOFFSET: ["2"],
      textCOLOR: ["brand-5"],
    },
    {
      textUNDERLINEOFFSET: ["4"],
      textCOLOR: ["brand-1"],
    },
  ],
  [
    {
      bgCOLOR: ["brand-4"],
      fontWEIGHT: ["bold"],
      px: ["3.5"],
      py: ["1.5"],
      rounded: ["lg"],
      textCOLOR: ["brand-1"],
    },
    {
      bgCOLOR: ["brand-3"],
    },
  ],
  [
    {
      bgCOLOR: ["brand-4"],
      display: ["inline-block"],
      fontWEIGHT: ["bold"],
      px: ["3.5"],
      py: ["2.5"],
      rounded: ["md"],
      textCOLOR: ["brand-1"],
    },
    {
      bgCOLOR: ["brand-3"],
      rotate: ["2"],
    },
  ],
];

const StyleLinkPanel = ({ node }: BasePanelProps) => {
  if (!isLinkNode(node)) return null;

  const buttonPayload = node.buttonPayload;
  const buttonClasses = buttonPayload?.buttonClasses || {};
  const hoverClasses = buttonPayload?.buttonHoverClasses || {};

  const mergedButtonClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

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
      expanded: true,
    });
  };

  const handleHoverStyleAdd = () => {
    settingsPanelStore.set({
      action: "style-link-add-hover",
      nodeId: node.id,
      expanded: true,
    });
  };

  const handleButtonStyleRemove = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-remove",
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleHoverStyleRemove = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-remove-hover",
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleButtonStyleUpdate = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-update",
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleHoverStyleUpdate = (className: string) => {
    settingsPanelStore.set({
      action: "style-link-update-hover",
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleLinkConfig = () => {
    settingsPanelStore.set({
      action: "style-link-config",
      nodeId: node.id,
      expanded: true,
    });
  };

  const applyQuickStyle = (styleIndex: number) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    if (!isLinkNode(linkNode)) return;

    const [buttonClasses, hoverClasses] = buttonStyleClasses[styleIndex];

    linkNode.buttonPayload = {
      ...linkNode.buttonPayload,
      buttonClasses,
      buttonHoverClasses: hoverClasses,
      callbackPayload: linkNode.buttonPayload?.callbackPayload || "",
    };

    ctx.modifyNodes([{ ...linkNode, isChanged: true }]);

    settingsPanelStore.set({
      action: "style-link",
      nodeId: node.id,
      expanded: true,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">
          Edit Link {node.tagName === "button" ? "Button" : ""} Styles
        </h2>

        <div className="pb-2">
          <div className="text-myblack text-sm p-2 border border-slate-200 rounded w-fit hover:bg-mygreen/20">
            <div title="Configure this Link" className="font-bold flex items-center gap-2">
              <Cog6ToothIcon className="w-4 h-4" />
              <button onClick={handleLinkConfig}>Configure Link Settings</button>
            </div>
          </div>
        </div>

        {Object.keys(buttonClasses).length === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold">Quick Style this Link</h3>
            <div className="flex flex-col gap-4">
              {buttonStyleOptions.map((_, index) => {
                const [buttonStyle, hoverStyle] = buttonStyleClasses[index];

                const [classesPayload] = processClassesForViewports(
                  getButtonStyleClasses(buttonStyle),
                  {},
                  1
                );
                const [classesHoverPayload] = processClassesForViewports(
                  getButtonStyleClasses(hoverStyle),
                  {},
                  1
                );
                const combinedClasses = `${classesPayload[0]} ${classesHoverPayload[0] ? addHoverPrefix(classesHoverPayload[0]) : ""}`;

                return (
                  <button
                    key={index}
                    onClick={() => applyQuickStyle(index)}
                    className={combinedClasses}
                  >
                    Use this Button Style
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(buttonClasses).length > 0 && (
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
                <li>
                  <StylesMemory node={node} />
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {Object.keys(buttonClasses).length > 0 && (
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
      )}
    </div>
  );
};

export default StyleLinkPanel;
