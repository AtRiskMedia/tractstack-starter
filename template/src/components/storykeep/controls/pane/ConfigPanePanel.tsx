import { useState } from "react";
import { keyboardAccessible } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowDownIcon from "@heroicons/react/24/outline/ArrowDownIcon";
import PaneTitlePanel from "./PanePanel_title";
import PaneSlugPanel from "./PanePanel_slug";
import PaneMagicPathPanel from "./PanePanel_path";
import PaneImpressionPanel from "./PanePanel_impression";
import { isContextPaneNode, hasBeliefPayload } from "@/utils/nodes/type-guards.tsx";
import { PaneConfigMode } from "@/types.ts";
import type { PaneNode } from "@/types.ts";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";

interface ConfigPanePanelProps {
  nodeId: string;
}

const ConfigPanePanel = ({ nodeId }: ConfigPanePanelProps) => {
  const ctx = getCtx();
  const activePaneMode = ctx.activePaneMode.get();
  const isActiveMode =
    activePaneMode.panel === `settings` && activePaneMode.paneId === nodeId && activePaneMode.mode;
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;
  const impressionNodes = ctx.getImpressionNodesForPanes([nodeId]);
  const isContextPane = isContextPaneNode(paneNode);
  const buttonClass =
    "px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10 whitespace-nowrap mb-1";

  const [mode, setMode] = useState<PaneConfigMode>(
    (isActiveMode as PaneConfigMode) || PaneConfigMode.DEFAULT
  );

  const setSaveMode = (newMode: PaneConfigMode) => {
    setMode(newMode);
    ctx.activePaneMode.set({ paneId: nodeId, mode: newMode, panel: `settings` });
  };

  if (mode === PaneConfigMode.TITLE) {
    return <PaneTitlePanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneConfigMode.SLUG) {
    return <PaneSlugPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneConfigMode.PATH) {
    return <PaneMagicPathPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneConfigMode.IMPRESSION) {
    return <PaneImpressionPanel nodeId={nodeId} setMode={setMode} />;
  }

  return (
    <div className="pt-1.5 bg-mylightgrey">
      <div className="p-1.5 bg-white rounded-t-md w-full group">
        <div className="flex flex-wrap gap-2">
          <div
            className={`flex flex-wrap gap-2 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity`}
          >
            <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
              <ArrowDownIcon className="w-6 h-6 mr-1" /> This Pane
            </div>
            {paneNode.isDecorative ? (
              <button className={buttonClass}>
                <CheckIcon className="w-4 h-4 inline" />
                {` `}
                <strong>Decorative Pane</strong> (no analytics tracked)
              </button>
            ) : (
              <>
                <button onClick={() => setSaveMode(PaneConfigMode.TITLE)} className={buttonClass}>
                  Title: <strong>{paneNode.title}</strong>
                </button>
                <button onClick={() => setSaveMode(PaneConfigMode.SLUG)} className={buttonClass}>
                  Slug: <strong>{paneNode.slug}</strong>
                </button>
                <button
                  onClick={() => setSaveMode(PaneConfigMode.IMPRESSION)}
                  className={buttonClass}
                >
                  {impressionNodes.length ? (
                    <>
                      <CheckIcon className="w-4 h-4 inline" />
                      {` `}
                      <span className="font-bold">Has Impression</span>
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="w-4 h-4 inline" />
                      {` `}
                      <span>No Impression</span>
                    </>
                  )}
                </button>
              </>
            )}
            {!isContextPane && (
              <button onClick={() => setSaveMode(PaneConfigMode.PATH)} className={buttonClass}>
                {hasBeliefPayload(paneNode) ? (
                  <>
                    <CheckIcon className="w-4 h-4 inline" />
                    {` `}
                    <span className="font-bold">Has Magic Path</span>
                  </>
                ) : (
                  <>
                    <XMarkIcon className="w-4 h-4 inline" />
                    {` `}
                    <span>No Magic Path</span>
                  </>
                )}
              </button>
            )}
            <div className="space-x-2">
              <button title="Move pane up" onClick={() => getCtx().moveNode(nodeId, "after")}>
                <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                </div>
              </button>
              <button title="Move pane down" onClick={() => getCtx().moveNode(nodeId, "before")}>
                <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
                  <ArrowUpIcon className="w-4 h-4 mr-1" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanePanel;
