import { useState, useEffect } from "react";
import { keyboardAccessible } from "@/store/storykeep.ts";
import { useStore } from "@nanostores/react";
import { getCtx } from "@/store/nodes.ts";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowDownIcon from "@heroicons/react/24/outline/ArrowDownIcon";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import PaintBrushIcon from "@heroicons/react/24/outline/PaintBrushIcon";
import PaneTitlePanel from "./PanePanel_title";
import PaneSlugPanel from "./PanePanel_slug";
import PaneMagicPathPanel from "./PanePanel_path";
import PaneImpressionPanel from "./PanePanel_impression";
import { isContextPaneNode, hasBeliefPayload } from "@/utils/nodes/type-guards.tsx";
import { settingsPanelStore, viewportKeyStore } from "@/store/storykeep";
import { PaneConfigMode } from "@/types.ts";
import type { PaneNode } from "@/types.ts";
import type { SetStateAction, Dispatch } from "react";

interface ConfigPanePanelProps {
  nodeId: string;
}

const ConfigPanePanel = ({ nodeId }: ConfigPanePanelProps) => {
  const ctx = getCtx();
  const isTemplate = useStore(ctx.isTemplate);
  const bgColorStyles = ctx.getNodeCSSPropertiesStyles(nodeId);
  const activePaneMode = useStore(ctx.activePaneMode);
  const toolMode = useStore(ctx.toolModeValStore);
  const reorderMode = toolMode.value === `move`;
  const isActiveMode = activePaneMode.panel === "settings" && activePaneMode.paneId === nodeId;

  const $viewportKey = useStore(viewportKeyStore);
  const isMobile = $viewportKey.value === `mobile`;

  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  const codeHookPayload = ctx.getNodeCodeHookPayload(nodeId);
  const isCodeHook = !!codeHookPayload;

  const impressionNodes = ctx.getImpressionNodesForPanes([nodeId]);
  const isContextPane = isContextPaneNode(paneNode);
  const buttonClass =
    "px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors whitespace-nowrap mb-1";

  const [mode, setMode] = useState<PaneConfigMode>(
    isActiveMode && activePaneMode.mode
      ? (activePaneMode.mode as PaneConfigMode)
      : PaneConfigMode.DEFAULT
  );

  useEffect(() => {
    if (isActiveMode && activePaneMode.mode) {
      setMode(activePaneMode.mode as PaneConfigMode);
    } else {
      setMode(PaneConfigMode.DEFAULT);
    }
  }, [isActiveMode, activePaneMode.mode]);

  const setSaveMode: Dispatch<SetStateAction<PaneConfigMode>> = (newMode) => {
    const resolvedMode = typeof newMode === "function" ? newMode(mode) : newMode;
    setMode(resolvedMode);
    ctx.setPanelMode(nodeId, "settings", resolvedMode);
  };

  const handleCodeHookConfig = () => {
    settingsPanelStore.set({
      action: "setup-codehook",
      nodeId: nodeId,
      expanded: true,
    });
  };

  const handleEditStyles = () => {
    ctx.closeAllPanels();
    ctx.toolModeValStore.set({ value: "styles" });
    if (paneNode.isDecorative) {
      const childNodeIds = ctx.getChildNodeIDs(nodeId);
      const bgPaneId = childNodeIds.find((id) => {
        const node = ctx.allNodes.get().get(id);
        return node && node.nodeType === "BgPane";
      });

      if (bgPaneId) {
        settingsPanelStore.set({
          action: "style-break",
          nodeId: bgPaneId,
          expanded: true,
        });
      }
    } else {
      settingsPanelStore.set({
        action: "style-parent",
        nodeId: nodeId,
        expanded: true,
      });
    }
  };

  if (mode === PaneConfigMode.TITLE) {
    return <PaneTitlePanel nodeId={nodeId} setMode={setSaveMode} />;
  } else if (mode === PaneConfigMode.SLUG) {
    return <PaneSlugPanel nodeId={nodeId} setMode={setSaveMode} />;
  } else if (mode === PaneConfigMode.PATH) {
    return <PaneMagicPathPanel nodeId={nodeId} setMode={setSaveMode} />;
  } else if (mode === PaneConfigMode.IMPRESSION) {
    return <PaneImpressionPanel nodeId={nodeId} setMode={setSaveMode} />;
  }

  return (
    <div className="border-t border-dotted border-mylightgrey bg-myoffwhite" style={bgColorStyles}>
      <div className="px-1.5 pt-1.5 pb-0.5 rounded-t-md w-full group">
        <div className="flex flex-wrap gap-2">
          <div
            className={`flex flex-wrap gap-2 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity`}
          >
            {paneNode.isDecorative ? (
              <>
                <button className={buttonClass}>
                  <CheckIcon className="w-4 h-4 inline" />
                  {` `}
                  <strong>Decorative Pane</strong>
                </button>
                <button onClick={handleEditStyles} className={buttonClass}>
                  <PaintBrushIcon className="w-4 h-4 inline" />
                  {` `}
                  <span>Edit Visual Break</span>
                </button>
              </>
            ) : (
              <>
                {!isTemplate && (
                  <>
                    <button
                      onClick={() => setSaveMode(PaneConfigMode.TITLE)}
                      className={buttonClass}
                    >
                      Pane Title
                      {!isMobile && (
                        <>
                          : <strong>{paneNode.title}</strong>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSaveMode(PaneConfigMode.SLUG)}
                      className={buttonClass}
                    >
                      Slug
                      {!isMobile && (
                        <>
                          : <strong>{paneNode.slug}</strong>
                        </>
                      )}
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
                {isCodeHook && (
                  <button onClick={handleCodeHookConfig} className={buttonClass}>
                    Configure Code Hook
                  </button>
                )}
                {!isCodeHook && (
                  <button onClick={handleEditStyles} className={buttonClass}>
                    <PaintBrushIcon className="w-4 h-4 inline" />
                    {` `}
                    <span>Style this Pane</span>
                  </button>
                )}
              </>
            )}
            {!isContextPane && !isTemplate && (
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
            {reorderMode && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanePanel;
