import { useState, useCallback, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import ViewportComboBox from "../fields/ViewportComboBox";
import { getCtx } from "../../../../store/nodes";
import type { BasePanelProps } from "../SettingsPanel";
import type { MarkdownPaneFragmentNode } from "../../../../types";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleParentUpdatePanel = ({ node, layer, className, config }: BasePanelProps) => {
  if (!node || !className || !layer) return null;
  if (!isMarkdownPaneFragmentNode(node)) return null;

  const [mobileValue, setMobileValue] = useState<string>(``);
  const [tabletValue, setTabletValue] = useState<string>(``);
  const [desktopValue, setDesktopValue] = useState<string>(``);

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        nodeId: node.id,
        layer: layer,
        action: `style-parent`,
      });
  };

  const handleCancel = () => {
    resetStore();
  };

  const handleFinalChange = useCallback(
    (value: string, viewport: "mobile" | "tablet" | "desktop") => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();

      // Get mutable copy of the node
      const markdownNode = cloneDeep(allNodes.get(node.id) as MarkdownPaneFragmentNode);
      if (!markdownNode || !isMarkdownPaneFragmentNode(markdownNode)) return;

      // Layer is 1-based but array is 0-based
      const layerIndex = layer - 1;
      const layerClasses = markdownNode?.parentClasses?.[layerIndex];
      if (!layerClasses) return;

      switch (viewport) {
        case "mobile":
          setMobileValue(value);
          layerClasses.mobile[className] = value;
          break;
        case "tablet":
          setTabletValue(value);
          layerClasses.tablet[className] = value;
          break;
        case "desktop":
          setDesktopValue(value);
          layerClasses.desktop[className] = value;
          break;
        default:
          return;
      }

      // Update the node in the store
      const updateNode = { ...markdownNode, isChanged: true };
      ctx.modifyNode(node.id, updateNode);
      console.log("parent panel update");
    },
    [node, layer, className]
  );

  // Initialize values from current node state
  useEffect(() => {
    if (!node?.parentClasses?.[layer - 1]) return;

    const layerClasses = node.parentClasses[layer - 1];
    if (layerClasses) {
      setMobileValue(layerClasses.mobile[className] || "");
      setTabletValue(layerClasses.tablet[className] || "");
      setDesktopValue(layerClasses.desktop[className] || "");
    }
  }, [node, layer, className]);

  return (
    <div className="space-y-4 z-50 isolate">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">
          <span className="font-bold">{friendlyName}</span> (Layer {layer})
        </h2>
        <button
          className="text-myblue hover:text-black"
          title="Return to preview pane"
          onClick={() => handleCancel()}
        >
          Go Back
        </button>
      </div>
      <div className="flex flex-col gap-y-2.5 my-3 text-mydarkgrey text-xl">
        <ViewportComboBox
          value={mobileValue}
          onFinalChange={handleFinalChange}
          values={values}
          viewport="mobile"
          config={config!}
        />
        <ViewportComboBox
          value={tabletValue}
          onFinalChange={handleFinalChange}
          values={values}
          viewport="tablet"
          isInferred={tabletValue === mobileValue}
          config={config!}
        />
        <ViewportComboBox
          value={desktopValue}
          onFinalChange={handleFinalChange}
          values={values}
          viewport="desktop"
          isInferred={desktopValue === tabletValue}
          config={config!}
        />
      </div>
    </div>
  );
};

export default StyleParentUpdatePanel;
