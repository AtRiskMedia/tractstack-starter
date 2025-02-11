import { useState, useCallback, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import ViewportComboBox from "../fields/ViewportComboBox";
import { tailwindClasses } from "@/utils/tailwind/tailwindClasses";
import { getCtx } from "@/store/nodes";
import type { BasePanelProps } from "../SettingsPanel";
import type { MarkdownPaneFragmentNode } from "@/types";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleParentUpdatePanel = ({ node, layer, className, config }: BasePanelProps) => {
  if (!node || !className || !layer) return null;
  if (!isMarkdownPaneFragmentNode(node)) return null;

  const [mobileValue, setMobileValue] = useState<string>(``);
  const [tabletValue, setTabletValue] = useState<string>(``);
  const [desktopValue, setDesktopValue] = useState<string>(``);
  const [pendingUpdate, setPendingUpdate] = useState<{
    value: string;
    viewport: "mobile" | "tablet" | "desktop";
  } | null>(null);

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        nodeId: node.id,
        layer: layer,
        action: `style-parent`,
        expanded: true,
      });
  };
  const handleCancel = () => {
    resetStore();
  };

  // Initialize values from current node state
  useEffect(() => {
    const layerIndex = layer - 1;
    const layerClasses = node?.parentClasses?.[layerIndex];
    if (!layerClasses) return;

    setMobileValue(layerClasses.mobile[className] || "");
    setTabletValue(layerClasses.tablet[className] || "");
    setDesktopValue(layerClasses.desktop[className] || "");
  }, [node, layer, className]);

  // Handle updates after state changes
  useEffect(() => {
    if (!pendingUpdate) return;

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const markdownNode = cloneDeep(allNodes.get(node.id)) as MarkdownPaneFragmentNode;
    if (!markdownNode) return;

    const layerIndex = layer - 1;
    const layerClasses = markdownNode.parentClasses?.[layerIndex];
    if (!layerClasses) return;

    switch (pendingUpdate.viewport) {
      case "mobile":
        layerClasses.mobile[className] = pendingUpdate.value;
        setMobileValue(pendingUpdate.value);
        break;
      case "tablet":
        layerClasses.tablet[className] = pendingUpdate.value;
        setTabletValue(pendingUpdate.value);
        break;
      case "desktop":
        layerClasses.desktop[className] = pendingUpdate.value;
        setDesktopValue(pendingUpdate.value);
        break;
    }

    ctx.modifyNodes([{ ...markdownNode, isChanged: true }]);
    setPendingUpdate(null);
  }, [pendingUpdate, node.id, layer, className]);

  const handleFinalChange = useCallback(
    (value: string, viewport: "mobile" | "tablet" | "desktop") => {
      setPendingUpdate({ value, viewport });
    },
    []
  );

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
