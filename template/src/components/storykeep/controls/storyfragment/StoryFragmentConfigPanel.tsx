import { useState, useEffect } from "react";
//import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { getCtx } from "@/store/nodes.ts";
import StoryFragmentTitlePanel from "./StoryFragmentPanel_title";
import StoryFragmentSlugPanel from "./StoryFragmentPanel_slug";
import StoryFragmentBgPanel from "./StoryFragmentPanel_bg";
import StoryFragmentMenuPanel from "./StoryFragmentPanel_menu";
import StoryFragmentOgPanel from "./StoryFragmentPanel_og";
import type { StoryFragmentNode } from "@/types.ts";

export enum StoryFragmentMode {
  DEFAULT = "DEFAULT",
  TITLE = "TITLE",
  SLUG = "SLUG",
  BG = "BG",
  MENU = "MENU",
  OG = "OG",
}

interface StoryFragmentPanelProps {
  nodeId: string;
}

const StoryFragmentConfigPanel = ({ nodeId }: StoryFragmentPanelProps) => {
  const [mode, setMode] = useState<StoryFragmentMode>(StoryFragmentMode.DEFAULT);

  useEffect(() => {
    setMode(StoryFragmentMode.DEFAULT);
  }, [nodeId]);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;
  if (!storyfragmentNode) return;
  console.log(storyfragmentNode);

  if (mode === StoryFragmentMode.TITLE) {
    return <StoryFragmentTitlePanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.SLUG) {
    return <StoryFragmentSlugPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.BG) {
    return <StoryFragmentBgPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.MENU) {
    return <StoryFragmentMenuPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.OG) {
    return <StoryFragmentOgPanel nodeId={nodeId} setMode={setMode} />;
  }

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md w-full group">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setMode(StoryFragmentMode.TITLE)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10 truncate max-w-full"
          >
            <span className="font-bold">Page Title:</span> {storyfragmentNode.title}
          </button>
          <button
            onClick={() => setMode(StoryFragmentMode.SLUG)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            <span className="font-bold">Slug:</span> {storyfragmentNode.slug}
          </button>
          <button
            onClick={() => setMode(StoryFragmentMode.BG)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Background
          </button>
          <button
            onClick={() => setMode(StoryFragmentMode.MENU)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Menu
          </button>
          <button
            onClick={() => setMode(StoryFragmentMode.OG)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Social Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentConfigPanel;
