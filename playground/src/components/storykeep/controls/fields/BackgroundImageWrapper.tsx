import { useState, useCallback } from "react";
import BackgroundImage from "./BackgroundImage";
import ArtpackImage from "./ArtpackImage";
import ColorPickerCombo from "./ColorPickerCombo";
import { getCtx } from "@/store/nodes.ts";
import { hasArtpacksStore } from "@/store/storykeep.ts";
import { useStore } from "@nanostores/react";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { BgImageNode, ArtpackImageNode, PaneNode, Config } from "@/types";
import { isArtpackImageNode } from "@/utils/nodes/type-guards";

export interface BackgroundImageWrapperProps {
  paneId: string;
  config?: Config;
}

const BackgroundImageWrapper = ({ paneId, config }: BackgroundImageWrapperProps) => {
  const ctx = getCtx();
  const allNodes = useStore(ctx.allNodes);
  const $artpacks = useStore(hasArtpacksStore);
  const hasArtpacks = $artpacks && Object.keys($artpacks).length > 0;

  // State to force re-renders when child components need it
  const [, setUpdateCounter] = useState(0);

  // Using useCallback to create a stable reference to the update function
  const onUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
    console.log("[BackgroundImageWrapper] Update triggered");
  }, []);

  const bgNode = (() => {
    const paneNode = allNodes.get(paneId) as PaneNode;
    if (!paneNode) return null;
    const childNodeIds = ctx.getChildNodeIDs(paneNode.id);
    const bgNodes = childNodeIds
      .map((id) => allNodes.get(id))
      .filter(
        (node) =>
          node?.nodeType === "BgPane" &&
          "type" in node &&
          (node.type === "background-image" || node.type === "artpack-image")
      ) as (BgImageNode | ArtpackImageNode)[];
    console.log(`[BackgroundImageWrapper] bgNodes for pane ${paneId}:`, bgNodes);
    return bgNodes[0] || null;
  })();

  const handleColorChange = (color: string) => {
    const paneNode = allNodes.get(paneId) as PaneNode;
    if (!paneNode) return;
    const updatedPaneNode = cloneDeep(paneNode);
    updatedPaneNode.bgColour = color;
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
    console.log(`[BackgroundImageWrapper] Set bgColour for pane ${paneId}:`, color);
  };

  console.log(`[BackgroundImageWrapper] Rendering pane ${paneId}, bgNode:`, bgNode);

  return (
    <div className="space-y-6 w-full">
      <h3 className="text-sm font-bold text-gray-700">Background</h3>

      {!bgNode && (
        <>
          <ColorPickerCombo
            title="Pane Background Color"
            defaultColor={(allNodes.get(paneId) as PaneNode)?.bgColour || ""}
            onColorChange={handleColorChange}
            config={config!}
            allowNull={true}
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Background Image</h4>
              <BackgroundImage paneId={paneId} onUpdate={onUpdate} />
              {hasArtpacks && <ArtpackImage paneId={paneId} onUpdate={onUpdate} />}
            </div>
          </div>
        </>
      )}

      {bgNode && (
        <div className="w-full">
          {isArtpackImageNode(bgNode) ? (
            <ArtpackImage paneId={paneId} onUpdate={onUpdate} />
          ) : (
            <BackgroundImage paneId={paneId} onUpdate={onUpdate} />
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundImageWrapper;
