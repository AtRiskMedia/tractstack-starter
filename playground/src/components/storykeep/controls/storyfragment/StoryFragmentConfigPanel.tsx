import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { settingsPanelStore } from "@/store/storykeep";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import TagIcon from "@heroicons/react/24/outline/TagIcon";
import { getCtx } from "@/store/nodes.ts";
import { findClosestTailwindColor } from "../fields/ColorPicker";
import ColorPickerCombo from "../fields/ColorPickerCombo";
import StoryFragmentSlugPanel from "./StoryFragmentPanel_slug";
import StoryFragmentMenuPanel from "./StoryFragmentPanel_menu";
import StoryFragmentOpenGraphPanel from "./StoryFragmentPanel_og";
import { tailwindToHex, hexToTailwind } from "@/utils/tailwind/tailwindColors.ts";
import { cloneDeep } from "@/utils/common/helpers";
import { StoryFragmentMode } from "@/types";
import type { StoryFragmentNode, Config } from "@/types";

const StoryFragmentConfigPanel = ({ nodeId, config }: { nodeId: string; config?: Config }) => {
  const [isNodeAvailable, setIsNodeAvailable] = useState(false);
  const [storyfragmentNode, setStoryfragmentNode] = useState<StoryFragmentNode | null>(null);
  const [isSEOReady, setIsSEOReady] = useState(false);

  const ctx = getCtx();
  const $mode = typeof ctx !== `undefined` ? useStore(ctx.storyFragmentModeStore) : null;
  const mode = $mode ? $mode[nodeId] : StoryFragmentMode.DEFAULT;

  const setMode = (newMode: StoryFragmentMode) => {
    ctx.setStoryFragmentMode(nodeId, newMode);
    settingsPanelStore.set(null);
  };

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

  // Check if SEO is ready by fetching description
  useEffect(() => {
    if (!isNodeAvailable || !storyfragmentNode) return;

    const checkSEOStatus = async () => {
      try {
        const detailsResponse = await fetch(
          `/api/turso/getStoryFragmentDetails?storyFragmentId=${nodeId}`
        );

        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          if (
            detailsData.success &&
            typeof detailsData?.data?.data?.description === `string` &&
            detailsData.data.data.description.trim() !== ""
          ) {
            setIsSEOReady(true);
          } else {
            setIsSEOReady(false);
          }
        }
      } catch (err) {
        console.error("Error checking SEO status:", err);
        setIsSEOReady(false);
      }
    };

    checkSEOStatus();
  }, [nodeId, isNodeAvailable, storyfragmentNode?.socialImagePath]);

  const handleBgColorChange = (newColor: string) => {
    if (!storyfragmentNode) return;

    const val = hexToTailwind(newColor, config?.init?.BRAND_COLOURS);
    const exactValPayload = val ? null : findClosestTailwindColor(newColor);
    const exactVal = exactValPayload && `${exactValPayload.name}-${exactValPayload.shade}`;

    if (exactVal || val) {
      const ctx = getCtx();
      // Make a proper clone that preserves the StoryFragmentNode type
      const updatedNode: StoryFragmentNode = {
        ...cloneDeep(storyfragmentNode),
        tailwindBgColour: exactVal || val || `white`,
        isChanged: true,
      };

      ctx.modifyNodes([updatedNode]);
      setStoryfragmentNode(updatedNode);
    }
  };

  if (!isNodeAvailable || !storyfragmentNode) {
    return null;
  }

  if (mode === StoryFragmentMode.SLUG) {
    return <StoryFragmentSlugPanel nodeId={nodeId} setMode={setMode} config={config!} />;
  } else if (mode === StoryFragmentMode.MENU) {
    return <StoryFragmentMenuPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.OG) {
    return <StoryFragmentOpenGraphPanel nodeId={nodeId} setMode={setMode} config={config} />;
  }

  return (
    <div className="mb-4">
      <div className="p-4 bg-white rounded-b-md w-full">
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setMode(StoryFragmentMode.OG)}
            className="min-h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200"
          >
            Title: <span className="font-bold">{storyfragmentNode.title}</span>
          </button>

          <button
            onClick={() => setMode(StoryFragmentMode.SLUG)}
            className="h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200"
          >
            Slug: <span className="font-bold">{storyfragmentNode.slug}</span>
          </button>

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

          <button
            onClick={() => setMode(StoryFragmentMode.OG)}
            className="h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200 flex items-center gap-1"
          >
            {isSEOReady ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span className="font-bold">SEO Ready</span>
              </>
            ) : (
              <>
                <TagIcon className="w-4 h-4 mr-1" />
                <span>SEO Ready?</span>
              </>
            )}
          </button>

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
