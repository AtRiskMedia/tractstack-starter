import { useState, useCallback, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import ViewportComboBox from "../fields/ViewportComboBox";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import { getCtx } from "../../../../store/nodes";
import { isLinkNode } from "@/utils/nodes/type-guards";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode } from "../../../../types";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleLinkUpdatePanel = ({ node, className, config }: BasePanelProps) => {
  if (!node || !className || (node.tagName !== "a" && node.tagName !== "button")) return null;

  const [value, setValue] = useState<string>("");

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];
  const isHoverMode = settingsPanelStore.get()?.action?.endsWith("-hover");

  const resetStore = () => {
    settingsPanelStore.set({
      action: "style-link",
      nodeId: node.id,
    });
  };

  // Initialize value from current node state
  useEffect(() => {
    if (!node.buttonPayload) return;

    const classes = isHoverMode
      ? node.buttonPayload.buttonHoverClasses
      : node.buttonPayload.buttonClasses;
    if (classes && className in classes) {
      setValue(classes[className][0] || "");
    }
  }, [node, className, isHoverMode]);

  const handleFinalChange = useCallback(
    (newValue: string) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
      if (!isLinkNode(linkNode)) return;

      const markdownId = ctx.getClosestNodeTypeFromId(node.id, "Markdown");
      if (!markdownId) return;

      // Initialize buttonPayload if it doesn't exist
      if (!linkNode.buttonPayload) {
        linkNode.buttonPayload = {
          buttonClasses: {},
          buttonHoverClasses: {},
          callbackPayload: "",
        };
      }

      // Update the appropriate classes object
      if (isHoverMode) {
        linkNode.buttonPayload.buttonHoverClasses = {
          ...linkNode.buttonPayload.buttonHoverClasses,
          [className]: [newValue],
        };
      } else {
        linkNode.buttonPayload.buttonClasses = {
          ...linkNode.buttonPayload.buttonClasses,
          [className]: [newValue],
        };
      }
      setValue(newValue);
      ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
    },
    [node, className, isHoverMode]
  );

  return (
    <div className="space-y-4 z-50 isolate">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">
          {friendlyName} ({isHoverMode ? "Hover" : "Button"} State)
        </h2>
        <button
          className="text-myblue hover:text-black"
          title="Return to link panel"
          onClick={resetStore}
        >
          Go Back
        </button>
      </div>

      <div className="flex flex-col gap-y-2.5 my-3 text-mydarkgrey text-xl">
        <ViewportComboBox
          value={value}
          onFinalChange={(newValue) => handleFinalChange(newValue)}
          values={values}
          viewport="mobile"
          config={config!}
          isInferred={false}
        />
      </div>
    </div>
  );
};

export default StyleLinkUpdatePanel;
