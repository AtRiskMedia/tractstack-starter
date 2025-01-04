import { useState } from "react";
import PaneBreakCollectionSelector from "../fields/PaneBreakCollectionSelector";
import PaneBreakShapeSelector from "../fields/PaneBreakShapeSelector";
import ColorPickerCombo from "../fields/ColorPickerCombo";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode } from "../../../../types";

interface BreakData {
  collection: string;
  image: string;
}

interface BreakSettings {
  collection: string;
  desktopImage: string;
  tabletImage: string;
  mobileImage: string;
  bgColor: string;
}

interface BreakNode extends FlatNode {
  breakDesktop: BreakData;
  breakTablet: BreakData;
  breakMobile: BreakData;
  bgColor?: string;
}

const isBreakNode = (node: FlatNode | null): node is BreakNode => {
  return node?.nodeType === "BgPane" && "breakDesktop" in node;
};

const StyleBreakPanel = ({ node, config }: BasePanelProps) => {
  if (!node || !isBreakNode(node)) {
    return null;
  }

  const [settings, setSettings] = useState<BreakSettings>({
    collection: node.breakDesktop?.collection ?? "kCz",
    desktopImage: node.breakDesktop?.image ?? "none",
    tabletImage: node.breakTablet?.image ?? "none",
    mobileImage: node.breakMobile?.image ?? "none",
    bgColor: node.bgColor ?? "#000000",
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

      <ColorPickerCombo
        defaultColor={settings.bgColor}
        onColorChange={(color: string) => setSettings((prev) => ({ ...prev, bgColor: color }))}
        config={config!}
      />

      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify(settings, null, 2)}</pre>
      </div>
    </div>
  );
};

export default StyleBreakPanel;
