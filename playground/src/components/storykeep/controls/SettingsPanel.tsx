import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { settingsPanelStore } from "@/store/storykeep";
import DebugPanel from "./DebugPanel";
import StyleBreakPanel from "./panels/StyleBreakPanel";
import StyleParentPanel from "./panels/StyleParentPanel";
import StyleParentRemovePanel from "./panels/StyleParentPanel_remove";
import StyleParentUpdatePanel from "./panels/StyleParentPanel_update";
import { type ReactElement } from "react";
import type { FlatNode, Config } from "@/types";
import { getCtx } from "../../../store/nodes";

export interface BasePanelProps {
  node: FlatNode | null;
  config?: Config | null;
  parentNode?: FlatNode;
  containerNode?: FlatNode;
  outerContainerNode?: FlatNode;
  layer?: number;
  className?: string;
}

const CodeHookPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Code Hook Settings</h2>
      <div className="p-2 bg-slate-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleWidgetPanel = ({
  node,
  containerNode,
  outerContainerNode,
  parentNode,
}: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Widget Settings</h2>
      <div className="p-2 bg-slate-100 rounded-lg">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({ node, containerNode, outerContainerNode, parentNode }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const StyleLiElementPanel = ({
  node,
  containerNode,
  outerContainerNode,
  parentNode,
}: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">List Item Style Settings</h2>
      <div className="p-2 bg-slate-100 rounded-lg">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({ node, containerNode, outerContainerNode, parentNode }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const StyleElementPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Element Style Settings</h2>
      <div className="p-2 bg-slate-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleLinkPanel = ({ node }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Style Link</h2>
      <div className="p-2 bg-slate-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleImagePanel = ({
  node,
  containerNode,
  outerContainerNode,
  parentNode,
}: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Image Settings</h2>
      <div className="p-2 bg-slate-100 rounded-lg">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({ node, containerNode, outerContainerNode, parentNode }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const getPanel = (
  config: Config | null,
  action: string,
  clickedNode: FlatNode | null,
  paneNode?: FlatNode,
  childNodes: FlatNode[] = [],
  layer?: number,
  className?: string
): ReactElement | null => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const markdownNode = childNodes.find((node) => node.nodeType === "Markdown");

  switch (action) {
    case "debug":
      return <DebugPanel />;
    case "style-break":
      return clickedNode ? (
        <StyleBreakPanel config={config} node={clickedNode} parentNode={paneNode} />
      ) : null;
    case "style-parent":
      return markdownNode ? (
        <StyleParentPanel node={markdownNode} parentNode={paneNode} layer={layer} />
      ) : null;
    case "style-parent-remove":
      return markdownNode ? (
        <StyleParentRemovePanel node={markdownNode} layer={layer} className={className} />
      ) : null;
    case "style-parent-update":
      return markdownNode ? (
        <StyleParentUpdatePanel node={markdownNode} layer={layer} className={className} />
      ) : null;
    case "style-link":
      return clickedNode ? <StyleLinkPanel node={clickedNode} /> : null;
    case "style-element":
      return clickedNode && markdownNode ? (
        <StyleElementPanel node={clickedNode} parentNode={markdownNode} />
      ) : null;
    case "style-li-element":
    case "style-widget":
    case "style-image": {
      if (!clickedNode?.parentId) return null;
      const containerNode = allNodes.get(clickedNode.parentId);
      if (!containerNode?.parentId) return null;
      const outerContainerNode = allNodes.get(containerNode.parentId);

      if (!containerNode || !outerContainerNode) return null;

      if (markdownNode && action === "style-widget") {
        return (
          <StyleWidgetPanel
            node={clickedNode}
            parentNode={markdownNode}
            containerNode={containerNode as FlatNode}
            outerContainerNode={outerContainerNode as FlatNode}
          />
        );
      } else if (markdownNode && action === "style-image") {
        return (
          <StyleImagePanel
            node={clickedNode}
            parentNode={markdownNode}
            containerNode={containerNode as FlatNode}
            outerContainerNode={outerContainerNode as FlatNode}
          />
        );
      }
      return (
        <StyleLiElementPanel
          node={clickedNode}
          parentNode={markdownNode}
          containerNode={containerNode as FlatNode}
          outerContainerNode={outerContainerNode as FlatNode}
        />
      );
    }
    case "setup-codehook":
      return clickedNode && markdownNode ? (
        <CodeHookPanel node={clickedNode} parentNode={markdownNode} />
      ) : null;
    default:
      console.log(`SettingsPanel miss on ${action}`);
      return null;
  }
};

const SettingsPanel = ({ config = null }: { config?: Config | null }) => {
  const signal = useStore(settingsPanelStore);
  if (!signal) return null;

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  // Get the clicked node
  const clickedNode = allNodes.get(signal.nodeId) as FlatNode | undefined;
  if (!clickedNode && signal.action !== `debug`) return null;

  let panel;
  // Special Case (click wasn't registered on markdown due to margins)
  if (signal.action === "debug") {
    panel = getPanel(config, "debug", null);
  } else if (clickedNode) {
    // Get the closest pane node
    const paneId =
      clickedNode.nodeType === "Pane"
        ? clickedNode.id
        : ctx.getClosestNodeTypeFromId(signal.nodeId, "Pane");
    const paneNode =
      clickedNode.nodeType === "Pane"
        ? clickedNode
        : paneId
          ? (allNodes.get(paneId) as FlatNode)
          : undefined;

    // Get child pane nodes if we're on a pane
    const childNodeIds = paneNode ? ctx.getChildNodeIDs(paneId) : [];
    const childNodes = childNodeIds
      .map((id) => allNodes.get(id))
      .filter((node): node is FlatNode => !!node);

    if (clickedNode.nodeType === "Pane") {
      panel = getPanel(config, signal.action, null, paneNode, childNodes, 1);
    } else {
      panel = getPanel(
        config,
        signal.action,
        clickedNode,
        paneNode,
        childNodes,
        signal.layer,
        signal.className
      );
    }
  }

  if (!panel) return null;

  return (
    <div className="fixed bottom-0 right-0 flex flex-col items-start">
      <button
        onClick={() => settingsPanelStore.set(null)}
        className="mb-2 p-2 bg-white rounded-full shadow-lg hover:bg-myorange hover:text-white transition-colors"
        aria-label="Close settings panel"
        title="Close settings panel"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      <div className="bg-white shadow-xl w-full md:w-[500px] rounded-tl-xl">
        <div id="settings-panel" className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
          <div className="p-4">{panel}</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
