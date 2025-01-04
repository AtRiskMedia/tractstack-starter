import { useState, useEffect } from "react";
import PaneBreakCollectionSelector from "../fields/PaneBreakCollectionSelector";
import PaneBreakShapeSelector from "../fields/PaneBreakShapeSelector";
import ColorPickerCombo from "../fields/ColorPickerCombo";
import type { BasePanelProps } from "../SettingsPanel";
import type { BaseNode, FlatNode } from "../../../../types";
import { getCtx } from "../../../../store/nodes";

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

interface PaneNodeWithBg extends BaseNode {
  nodeType: "Pane";
  bgColour: string;
}

const isBreakNode = (node: FlatNode | null): node is BreakNode => {
  return node?.nodeType === "BgPane" && "breakDesktop" in node;
};

const isPaneNodeWithBg = (node: BaseNode | undefined): node is PaneNodeWithBg => {
  return node?.nodeType === "Pane" && "bgColour" in node;
};

const StyleBreakPanel = ({ node, parentNode, config }: BasePanelProps) => {
  if (!node || !isBreakNode(node) || !parentNode || !isPaneNodeWithBg(parentNode)) {
    return null;
  }

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  const [settings, setSettings] = useState<BreakSettings>({
    collection: node.breakDesktop?.collection ?? "kCz",
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
      collection: node.breakDesktop?.collection ?? "kCz",
      desktopImage: node.breakDesktop?.image ?? "none",
      tabletImage: node.breakTablet?.image ?? "none",
      mobileImage: node.breakMobile?.image ?? "none",
      svgFill: node.breakDesktop?.svgFill ?? "#FFFFFF",
      bgColor: parentNode.bgColour ?? "#000000",
    };

    // Get mutable copies of the nodes
    const breakNode = allNodes.get(node.id) as BreakNode;
    const paneNode = allNodes.get(parentNode.id) as PaneNodeWithBg;

    if (!breakNode || !paneNode || !isPaneNodeWithBg(paneNode)) return;

    Object.entries(settings).forEach(([key, value]) => {
      if (value !== prevSettings[key as keyof BreakSettings]) {
        switch (key) {
          case "collection":
            breakNode.breakDesktop.collection = value;
            breakNode.breakTablet.collection = value;
            breakNode.breakMobile.collection = value;
            console.log("collection changed:", value);
            break;

          case "desktopImage":
            breakNode.breakDesktop.image = value;
            console.log("desktop image changed:", value);
            break;

          case "tabletImage":
            breakNode.breakTablet.image = value;
            console.log("tablet image changed:", value);
            break;

          case "mobileImage":
            breakNode.breakMobile.image = value;
            console.log("mobile image changed:", value);
            break;

          case "svgFill":
            breakNode.breakDesktop.svgFill = value;
            breakNode.breakTablet.svgFill = value;
            breakNode.breakMobile.svgFill = value;
            console.log("svg fill color changed:", value);
            break;

          case "bgColor":
            paneNode.bgColour = value;
            console.log("background color changed:", value);
            break;
        }
      }
    });

    // Update the nodes in the store
    const newNodes = new Map(allNodes);
    newNodes.set(node.id, breakNode);
    newNodes.set(parentNode.id, paneNode);
    ctx.allNodes.set(newNodes);

    // Notify parent of changes
    if (parentNode.id) {
      ctx.notifyNode(parentNode.id);
    }
  }, [settings, node, parentNode, ctx, allNodes]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Visual Break Settings</h2>

      <div className="space-y-2">
        <label className="block text-sm text-mydarkgrey">Collection</label>
        <PaneBreakCollectionSelector
          selectedCollection={settings.collection}
          onChange={(collection) => setSettings((prev) => ({ ...prev, collection }))}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-mydarkgrey">Shapes</label>
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
      />
    </div>
  );
};

export default StyleBreakPanel;
