import { useState, useEffect } from "react";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { getCtx } from "@/store/nodes.ts";
import ColorPickerCombo from "../fields/ColorPickerCombo";
import StoryFragmentTitlePanel from "./StoryFragmentPanel_title";
import StoryFragmentSlugPanel from "./StoryFragmentPanel_slug";
import StoryFragmentMenuPanel from "./StoryFragmentPanel_menu";
import StoryFragmentOgPanel from "./StoryFragmentPanel_og";
import { tailwindToHex } from "@/utils/tailwind/tailwindColors.ts";
import type { StoryFragmentNode, Config } from "@/types.ts";
import { StoryFragmentMode, type StoryFragmentModeType } from "@/types.ts";

const StoryFragmentConfigPanel = ({ nodeId, config }: { nodeId: string; config?: Config }) => {
  const [mode, setMode] = useState<StoryFragmentModeType>(StoryFragmentMode.DEFAULT);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;

  useEffect(() => {
    setMode(StoryFragmentMode.DEFAULT);
  }, [nodeId]);

  if (!storyfragmentNode) return null;

  const handleBgColorChange = (newColor: string) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const updatedNode = {
      ...storyfragmentNode,
      tailwindBgColour: newColor,
      isChanged: true,
    };
    const newNodes = new Map(allNodes);
    newNodes.set(nodeId, updatedNode);
    ctx.allNodes.set(newNodes);
    ctx.notifyNode(nodeId);
  };

  if (mode === StoryFragmentMode.TITLE) {
    return <StoryFragmentTitlePanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.SLUG) {
    return <StoryFragmentSlugPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.MENU) {
    return <StoryFragmentMenuPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.OG) {
    return <StoryFragmentOgPanel nodeId={nodeId} setMode={setMode} />;
  }

  return (
    <div className="mb-4">
      <div className="p-1.5 bg-white rounded-b-md w-full group">
        <div className="px-3.5">
          <h3 className="text-lg font-bold mb-4">Configure Web Page</h3>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMode(StoryFragmentMode.TITLE)}
                className="px-2 py-1 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
              >
                Title: <strong>{storyfragmentNode.title}</strong>
              </button>
              <button
                onClick={() => setMode(StoryFragmentMode.SLUG)}
                className="px-2 py-1 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
              >
                Slug: <strong>{storyfragmentNode.slug}</strong>
              </button>
              <button
                onClick={() => setMode(StoryFragmentMode.MENU)}
                className="px-2 py-1 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
              >
                {storyfragmentNode.hasMenu ? (
                  <CheckIcon className="w-4 h-4 inline" />
                ) : (
                  <XMarkIcon className="w-4 h-4 inline" />
                )}{" "}
                Menu
              </button>
              <button
                onClick={() => setMode(StoryFragmentMode.OG)}
                className="px-2 py-1 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
              >
                {storyfragmentNode.socialImagePath ? (
                  <CheckIcon className="w-4 h-4 inline" />
                ) : (
                  <XMarkIcon className="w-4 h-4 inline" />
                )}{" "}
                Social Image
              </button>
            </div>
            <div className="space-y-2 max-w-80">
              {config && (
                <ColorPickerCombo
                  title="Background Color"
                  defaultColor={tailwindToHex(
                    storyfragmentNode.tailwindBgColour || "#ffffff",
                    config?.init?.BRAND_COLOURS || null
                  )}
                  onColorChange={handleBgColorChange}
                  config={config}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentConfigPanel;
