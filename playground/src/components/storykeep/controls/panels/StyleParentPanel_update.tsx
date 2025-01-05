import { useState, useCallback, useEffect } from "react";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import ViewportComboBox from "../../fields/ViewportComboBox";
import { getCtx } from "../../../../store/nodes";
import type { BasePanelProps } from "../SettingsPanel";
import type { MarkdownPaneFragmentNode, FlatNode } from "../../../../types";

const isMarkdownPaneFragmentNode = (
  node: FlatNode | MarkdownPaneFragmentNode
): node is MarkdownPaneFragmentNode => {
  return "type" in node && node.type === "markdown";
};

const StyleParentUpdatePanel = ({ node, layer, className, config }: BasePanelProps) => {
  if (!node || !className || !layer) return null;
  if (!isMarkdownPaneFragmentNode(node)) return null;

  const [mobileValue, setMobileValue] = useState<string>(``);
  const [tabletValue, setTabletValue] = useState<string>(``);
  const [desktopValue, setDesktopValue] = useState<string>(``);

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];

  const handleFinalChange = useCallback(
    (value: string, viewport: "mobile" | "tablet" | "desktop") => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();

      // Get mutable copy of the node
      const markdownNode = allNodes.get(node.id) as MarkdownPaneFragmentNode;
      if (!markdownNode || !markdownNode.parentClasses) return;

      // Layer is 1-based but array is 0-based
      const layerIndex = layer - 1;
      const layerClasses = markdownNode.parentClasses[layerIndex];
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
      const newNodes = new Map(allNodes);
      newNodes.set(node.id, markdownNode);
      ctx.allNodes.set(newNodes);

      // Notify parent of changes
      if (node.parentId) {
        ctx.notifyNode(node.parentId);
      }
    },
    [node, layer, className]
  );

  // Initialize values from current node state
  useEffect(() => {
    if (!node?.parentClasses?.[layer - 1]) return;

    const layerClasses = node.parentClasses[layer - 1];
    if (layerClasses && className in layerClasses.mobile) {
      setMobileValue(layerClasses.mobile[className]?.[0] || "");
      setTabletValue(layerClasses.tablet[className]?.[1] || "");
      setDesktopValue(layerClasses.desktop[className]?.[2] || "");
    }
  }, [node, layer, className]);

  return (
    <div className="space-y-4 z-[9999] isolate">
      <h2 className="text-xl font-bold">
        Style <span className="font-bold">{friendlyName}</span>
      </h2>
      <div className="space-y-4 rounded p-6 bg-slate-50">
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
    </div>
  );
};

export default StyleParentUpdatePanel;
