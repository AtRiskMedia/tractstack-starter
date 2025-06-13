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
    setUpdateCounter((prev) => prev + 1);
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
    return bgNodes[0] || null;
  })();

  const handleColorChange = (color: string) => {
    const paneNode = allNodes.get(paneId) as PaneNode;
    if (!paneNode) return;
    const updatedPaneNode = cloneDeep(paneNode);
    updatedPaneNode.bgColour = color;
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
  };

  const handlePositionChange = (newPosition: "background" | "left" | "right") => {
    if (!bgNode) return;
    const updatedBgNode = cloneDeep(bgNode);
    updatedBgNode.position = newPosition;
    updatedBgNode.isChanged = true;
    const updatedPaneNode = cloneDeep(allNodes.get(paneId) as PaneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    onUpdate();
  };

  const handleSizeChange = (newSize: "equal" | "narrow" | "wide") => {
    if (!bgNode) return;
    const updatedBgNode = cloneDeep(bgNode);
    updatedBgNode.size = newSize;
    updatedBgNode.isChanged = true;
    const updatedPaneNode = cloneDeep(allNodes.get(paneId) as PaneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    onUpdate();
  };

  const position = bgNode?.position || "background";
  const size = bgNode?.size || "equal";

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
        <div className="w-full space-y-6">
          {/* Position Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Position</label>
            <div className="flex space-x-4">
              {(["background", "left", "right"] as const).map((pos) => (
                <label key={pos} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="position"
                    value={pos}
                    checked={position === pos}
                    onChange={() => handlePositionChange(pos)}
                    className="focus:ring-myblue h-4 w-4 text-myblue border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{pos}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Size Toggle - Only show when position is left or right */}
          {position !== "background" && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Size</label>
              <div className="flex space-x-4">
                {(["equal", "narrow", "wide"] as const).map((s) => (
                  <label key={s} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      onChange={() => handleSizeChange(s)}
                      className="focus:ring-myblue h-4 w-4 text-myblue border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {s === "narrow"
                        ? "Narrow (30%)"
                        : s === "wide"
                          ? "Wide (70%)"
                          : "Equal (50%)"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Render the appropriate image component */}
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
