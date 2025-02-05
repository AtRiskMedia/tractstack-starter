import { useState, useEffect } from "react";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { getCtx } from "@/store/nodes.ts";
import { findClosestTailwindColor } from "../fields/ColorPicker";
import ColorPickerCombo from "../fields/ColorPickerCombo";
import StoryFragmentTitlePanel from "./StoryFragmentPanel_title";
import StoryFragmentSlugPanel from "./StoryFragmentPanel_slug";
import StoryFragmentMenuPanel from "./StoryFragmentPanel_menu";
import StoryFragmentOgPanel from "./StoryFragmentPanel_og";
import { tailwindToHex, hexToTailwind } from "@/utils/tailwind/tailwindColors.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { StoryFragmentNode, Config } from "@/types.ts";
import { StoryFragmentMode, type StoryFragmentModeType } from "@/types.ts";

const StoryFragmentConfigPanel = ({ nodeId, config }: { nodeId: string; config?: Config }) => {
  const [mode, setMode] = useState<StoryFragmentModeType>(StoryFragmentMode.DEFAULT);
  const [isNodeAvailable, setIsNodeAvailable] = useState(false);
  const [storyfragmentNode, setStoryfragmentNode] = useState<StoryFragmentNode | null>(null);

  useEffect(() => {
    setMode(StoryFragmentMode.DEFAULT);
    setIsNodeAvailable(false);
    setStoryfragmentNode(null);
  }, [nodeId]);

  useEffect(() => {
    // Check for node availability
    const checkNode = () => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const node = allNodes.get(nodeId) as StoryFragmentNode;

      if (node) {
        setStoryfragmentNode(node);
        setIsNodeAvailable(true);
      }
    };

    // Initial check
    checkNode();

    // Set up an interval to check until node is available
    const intervalId = setInterval(() => {
      if (!isNodeAvailable) {
        checkNode();
      } else {
        clearInterval(intervalId);
      }
    }, 100); // Check every 100ms

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [nodeId, isNodeAvailable]);

  if (!isNodeAvailable || !storyfragmentNode) {
    return null;
  }

  const handleBgColorChange = (newColor: string) => {
    const val = hexToTailwind(newColor, config?.init?.BRAND_COLOURS);
    const exactValPayload = val ? null : findClosestTailwindColor(newColor);
    const exactVal = exactValPayload && `${exactValPayload.name}-${exactValPayload.shade}`;
    if (exactVal || val) {
      const ctx = getCtx();
      const updatedNode = {
        ...cloneDeep(storyfragmentNode),
        tailwindBgColour: exactVal || val || `white`,
        isChanged: true,
      };
      ctx.modifyNodes([updatedNode]);
      setStoryfragmentNode(updatedNode);
    }
  };

  if (mode === StoryFragmentMode.TITLE) {
    return <StoryFragmentTitlePanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.SLUG) {
    return <StoryFragmentSlugPanel nodeId={nodeId} setMode={setMode} config={config!} />;
  } else if (mode === StoryFragmentMode.MENU) {
    return <StoryFragmentMenuPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.OG) {
    return <StoryFragmentOgPanel nodeId={nodeId} setMode={setMode} />;
  }

  return (
    <div className="mb-4">
      <div className="p-4 bg-white rounded-b-md w-full">
        <div className="flex items-center flex-wrap gap-2">
          {/* Title control */}
          <button
            onClick={() => setMode(StoryFragmentMode.TITLE)}
            className="min-h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200"
          >
            Title: <span className="font-bold">{storyfragmentNode.title}</span>
          </button>

          {/* Slug control */}
          <button
            onClick={() => setMode(StoryFragmentMode.SLUG)}
            className="h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200"
          >
            Slug: <span className="font-bold">{storyfragmentNode.slug}</span>
          </button>

          {/* Menu control */}
          <button
            onClick={() => setMode(StoryFragmentMode.MENU)}
            className="h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200 flex items-center gap-1"
          >
            {storyfragmentNode.hasMenu ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span className="font-bold">Has Menu</span>
              </>
            ) : (
              <>
                <XMarkIcon className="w-4 h-4" />
                <span>No Menu</span>
              </>
            )}
          </button>

          {/* Social Share control */}
          <button
            onClick={() => setMode(StoryFragmentMode.OG)}
            className="h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200 flex items-center gap-1"
          >
            {storyfragmentNode.socialImagePath ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span className="font-bold">Social Share Image</span>
              </>
            ) : (
              <>
                <XMarkIcon className="w-4 h-4" />
                <span>Social Share Image</span>
              </>
            )}
          </button>

          {/* Color picker */}
          {config && (
            <div className="flex items-center gap-2 h-9">
              <div className="text-md">Background Colour:</div>
              <ColorPickerCombo
                title=""
                defaultColor={tailwindToHex(
                  storyfragmentNode.tailwindBgColour || `white`,
                  config?.init?.BRAND_COLOURS || null
                )}
                onColorChange={handleBgColorChange}
                config={config}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentConfigPanel;
