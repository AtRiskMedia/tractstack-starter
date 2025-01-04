// StyleBreakPanel.tsx
import { useState } from "react";
import PaneBreakCollectionSelector from "../fields/PaneBreakCollectionSelector";
import PaneBreakShapeSelector from "../fields/PaneBreakShapeSelector";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode } from "../../../../types";

interface BreakData {
  collection: string;
  image: string;
}

interface BreakNode extends FlatNode {
  breakDesktop: BreakData;
  breakTablet: BreakData;
  breakMobile: BreakData;
}

const isBreakNode = (node: FlatNode | null): node is BreakNode => {
  return node?.nodeType === "BgPane" && "breakDesktop" in node;
};

const StyleBreakPanel = ({ node }: BasePanelProps) => {
  if (!node || !isBreakNode(node)) {
    return null;
  }

  const [settings, setSettings] = useState({
    collection: node.breakDesktop?.collection ?? "kCz",
    desktopImage: node.breakDesktop?.image ?? "none",
    tabletImage: node.breakTablet?.image ?? "none",
    mobileImage: node.breakMobile?.image ?? "none",
  });

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

      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify(settings, null, 2)}</pre>
      </div>
    </div>
  );
};

export default StyleBreakPanel;
