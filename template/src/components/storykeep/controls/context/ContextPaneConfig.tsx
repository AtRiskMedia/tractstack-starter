import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { getCtx } from "@/store/nodes";
import { settingsPanelStore } from "@/store/storykeep";
import ContextPaneTitlePanel from "./ContextPaneConfig_title";
import ContextPaneSlugPanel from "./ContextPaneConfig_slug";
import { ContextPaneMode } from "@/types";
import type { PaneNode } from "@/types";

const ContextPaneConfig = ({ nodeId }: { nodeId: string }) => {
  const [isNodeAvailable, setIsNodeAvailable] = useState(false);
  const [paneNode, setPaneNode] = useState<PaneNode | null>(null);

  const nodesCtx = getCtx();
  const activePaneMode = useStore(nodesCtx.activePaneMode);

  const isActive = activePaneMode.panel === "context" && activePaneMode.paneId === nodeId;

  const mode =
    isActive && activePaneMode.mode
      ? (activePaneMode.mode as ContextPaneMode)
      : ContextPaneMode.DEFAULT;

  const setMode = (newMode: ContextPaneMode) => {
    nodesCtx.setPanelMode(nodeId, "context", newMode);
    settingsPanelStore.set(null);
  };

  useEffect(() => {
    const checkNode = () => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const node = allNodes.get(nodeId) as PaneNode;

      if (node) {
        setPaneNode(node);
        setIsNodeAvailable(true);
      }
    };

    checkNode();

    const intervalId = setInterval(() => {
      if (!isNodeAvailable) {
        checkNode();
      } else {
        clearInterval(intervalId);
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [nodeId, isNodeAvailable]);

  if (!isNodeAvailable || !paneNode) {
    return null;
  }

  if (mode === ContextPaneMode.TITLE) {
    return <ContextPaneTitlePanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === ContextPaneMode.SLUG) {
    return <ContextPaneSlugPanel nodeId={nodeId} setMode={setMode} />;
  }

  return (
    <div className="mb-4">
      <div className="p-4 bg-white rounded-b-md w-full">
        <div className="flex items-center flex-wrap gap-2">
          {/* Title control */}
          <button
            onClick={() => setMode(ContextPaneMode.TITLE)}
            className="min-h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200"
          >
            Title: <span className="font-bold">{paneNode.title}</span>
          </button>

          {/* Slug control */}
          <button
            onClick={() => setMode(ContextPaneMode.SLUG)}
            className="h-9 px-3 bg-white text-cyan-700 text-md rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors border border-cyan-200"
          >
            Slug: <span className="font-bold">{paneNode.slug}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextPaneConfig;
