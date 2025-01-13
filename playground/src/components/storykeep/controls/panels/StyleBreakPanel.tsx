import { useState, useEffect } from "react";
import PaneBreakCollectionSelector from "../fields/PaneBreakCollectionSelector";
import PaneBreakShapeSelector from "../fields/PaneBreakShapeSelector";
import ColorPickerCombo from "../fields/ColorPickerCombo";
import { getCtx } from "../../../../store/nodes";
import { collections } from "../../../../constants";
import { isBreakNode, isPaneNode } from "../../../../utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode, PaneNode } from "../../../../types";

interface BreakData {
  collection: string;
  image: string;
  svgFill: string;
}

interface BreakSettings {
  collection: string;
  desktopImage: string;
  tabletImage: string;
  mobileImage: string;
  svgFill: string;
  bgColor: string;
}

interface BreakNode extends FlatNode {
  breakDesktop: BreakData;
  breakTablet: BreakData;
  breakMobile: BreakData;
  bgColor: string;
}

const StyleBreakPanel = ({ node, parentNode, config }: BasePanelProps) => {
  if (!node || !isBreakNode(node) || !parentNode || !isPaneNode(parentNode)) {
    return null;
  }

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  const [settings, setSettings] = useState<BreakSettings>({
    collection: node.breakDesktop?.collection ?? collections[0] ?? `kCz`,
    desktopImage: node.breakDesktop?.image ?? "none",
    tabletImage: node.breakTablet?.image ?? "none",
    mobileImage: node.breakMobile?.image ?? "none",
    svgFill: node.breakDesktop?.svgFill ?? "#FFFFFF",
    bgColor: parentNode.bgColour ?? "#000000",
  });

  // Monitor settings changes
  useEffect(() => {
    if (!node || !parentNode) return;

    const prevSettings = {
      collection: node.breakDesktop?.collection ?? collections[0] ?? `kCz`,
      desktopImage: node.breakDesktop?.image ?? "none",
      tabletImage: node.breakTablet?.image ?? "none",
      mobileImage: node.breakMobile?.image ?? "none",
      svgFill: node.breakDesktop?.svgFill ?? "#FFFFFF",
      bgColor: parentNode.bgColour ?? "#000000",
    };

    // Get mutable copies of the nodes
    const breakNode = cloneDeep(allNodes.get(node.id)) as BreakNode;
    const paneNode = cloneDeep(allNodes.get(parentNode.id)) as PaneNode;

    if (!breakNode || !paneNode || !isPaneNode(paneNode)) return;

    Object.entries(settings).forEach(([key, value]) => {
      if (value !== prevSettings[key as keyof BreakSettings]) {
        switch (key) {
          case "collection":
            breakNode.breakDesktop.collection = value;
            breakNode.breakTablet.collection = value;
            breakNode.breakMobile.collection = value;
            break;

          case "desktopImage":
            breakNode.breakDesktop.image = value;
            break;

          case "tabletImage":
            breakNode.breakTablet.image = value;
            break;

          case "mobileImage":
            breakNode.breakMobile.image = value;
            break;

          case "svgFill":
            breakNode.breakDesktop.svgFill = value;
            breakNode.breakTablet.svgFill = value;
            breakNode.breakMobile.svgFill = value;
            break;

          case "bgColor":
            paneNode.bgColour = value;
            break;
        }
      }
    });

    const updatedNodes = [
      { ...breakNode, isChanged: true },
      { ...paneNode, isChanged: true },
    ];
    ctx.modifyNodes(updatedNodes);
  }, [settings, node, parentNode, ctx, allNodes]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Visual Break Settings</h2>

      {collections.length > 1 && (
        <div className="space-y-2">
          <span className="block text-sm text-mydarkgrey">Collection</span>
          <PaneBreakCollectionSelector
            selectedCollection={settings.collection}
            onChange={(collection) => setSettings((prev) => ({ ...prev, collection }))}
          />
        </div>
      )}

      <div className="space-y-2">
        <span className="block text-sm text-mydarkgrey">Shapes (for each screen size)</span>
        <div className="space-y-1">
          <PaneBreakShapeSelector
            viewport="mobile"
            selectedImage={settings.mobileImage}
            onChange={(image) => setSettings((prev) => ({ ...prev, mobileImage: image }))}
          />
          <PaneBreakShapeSelector
            viewport="tablet"
            selectedImage={settings.tabletImage}
            onChange={(image) => setSettings((prev) => ({ ...prev, tabletImage: image }))}
          />
          <PaneBreakShapeSelector
            viewport="desktop"
            selectedImage={settings.desktopImage}
            onChange={(image) => setSettings((prev) => ({ ...prev, desktopImage: image }))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <ColorPickerCombo
            title="Shape Color"
            defaultColor={settings.svgFill}
            onColorChange={(color: string) => setSettings((prev) => ({ ...prev, svgFill: color }))}
            config={config!}
          />
          <ColorPickerCombo
            title="Background Color"
            defaultColor={settings.bgColor}
            onColorChange={(color: string) => setSettings((prev) => ({ ...prev, bgColor: color }))}
            config={config!}
            allowNull={true}
          />
        </div>
      </div>
    </div>
  );
};

export default StyleBreakPanel;
