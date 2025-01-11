import { useState, useEffect } from "react";
import { keyboardAccessible } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import ArrowDownIcon from "@heroicons/react/24/outline/ArrowDownIcon";
import PaneTitlePanel from "./PanePanel_title";
import PaneSlugPanel from "./PanePanel_slug";
import PaneAdvPanel from "./PanePanel_adv";
import PaneBgPanel from "./PanePanel_bg";
import PaneCodeHookPanel from "./PanePanel_codehook";
import PaneMagicPathPanel from "./PanePanel_path";
import PaneImpressionPanel from "./PanePanel_impression";
import type { PaneNode } from "@/types.ts";

export enum PaneMode {
  DEFAULT = "DEFAULT",
  TITLE = "TITLE",
  SLUG = "SLUG",
  ADV = "ADV",
  BG = "BG",
  CODEHOOK = "CODEHOOK",
  PATH = "PATH",
  IMPRESSION = "IMPRESSION",
}

interface ConfigPanePanelProps {
  nodeId: string;
}

const ConfigPanePanel = ({ nodeId }: ConfigPanePanelProps) => {
  const [mode, setMode] = useState<PaneMode>(PaneMode.DEFAULT);

  useEffect(() => {
    setMode(PaneMode.DEFAULT);
  }, [nodeId]);

  if (mode === PaneMode.TITLE) {
    return <PaneTitlePanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneMode.SLUG) {
    return <PaneSlugPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneMode.ADV) {
    return <PaneAdvPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneMode.BG) {
    return <PaneBgPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneMode.CODEHOOK) {
    return <PaneCodeHookPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneMode.PATH) {
    return <PaneMagicPathPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneMode.IMPRESSION) {
    return <PaneImpressionPanel nodeId={nodeId} setMode={setMode} />;
  }

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-b-md flex gap-1 w-full group">
        <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md">
          <ArrowDownIcon className="w-6 h-6 inline-block" /> This Pane
        </div>
        <div
          className={`flex gap-1 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity`}
        >
          <button
            onClick={() => setMode(PaneMode.TITLE)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Pane Title:
            <strong>{paneNode.title}</strong>
          </button>
          <button
            onClick={() => setMode(PaneMode.SLUG)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Slug: <strong>{paneNode.slug}</strong>
          </button>
          <button
            onClick={() => setMode(PaneMode.ADV)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Advanced Settings
          </button>
          <button
            onClick={() => setMode(PaneMode.BG)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Background
          </button>
          <button
            onClick={() => setMode(PaneMode.CODEHOOK)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Code Hook
          </button>
          <button
            onClick={() => setMode(PaneMode.PATH)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Magic Paths
          </button>
          <button
            onClick={() => setMode(PaneMode.IMPRESSION)}
            className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
          >
            Impression
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanePanel;
