import { useState, useEffect } from "react";
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
import type { PaneNode } from "@/types.ts";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";

export enum PaneMode {
  DEFAULT = "DEFAULT",
  TITLE = "TITLE",
  SLUG = "SLUG",
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
  } else if (mode === PaneMode.PATH) {
    return <PaneMagicPathPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === PaneMode.IMPRESSION) {
    return <PaneImpressionPanel nodeId={nodeId} setMode={setMode} />;
  }

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;
  const impressionNodes = ctx.getImpressionNodesForPanes([nodeId]);
  const isContextPane = isContextPaneNode(paneNode);

  const buttonClass =
    "px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10 whitespace-nowrap mb-1";

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-b-md w-full group">
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
                <button onClick={() => setMode(PaneMode.TITLE)} className={buttonClass}>
                  Title: <strong>{paneNode.title}</strong>
                </button>
                <button onClick={() => setMode(PaneMode.SLUG)} className={buttonClass}>
                  Slug: <strong>{paneNode.slug}</strong>
                </button>
                <button onClick={() => setMode(PaneMode.IMPRESSION)} className={buttonClass}>
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
              <button onClick={() => setMode(PaneMode.PATH)} className={buttonClass}>
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
            <button onClick={() => getCtx().moveNode(nodeId, "after")}>
              <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
                <ArrowDownIcon className="w-6 h-6 mr-1" />
              </div>
            </button>
            <button onClick={() => getCtx().moveNode(nodeId, "before")}>
              <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
                <ArrowUpIcon className="w-6 h-6 mr-1" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanePanel;
