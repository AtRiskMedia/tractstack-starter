import { useStore } from "@nanostores/react";
import { settingsPanelStore } from "@/store/storykeep";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { type ReactElement } from "react";
import type { FlatNode } from "@/types";
import { getCtx } from "../../../store/nodes";

// Panel type interfaces
interface BasePanelProps {
  node: FlatNode | null;
  parentNode?: FlatNode;
  containerNode?: FlatNode;
  outerContainerNode?: FlatNode;
  layer?: number;
}

const CodeHookPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Code Hook Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

// Individual panel components
const StyleBreakPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Visual Break Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleParentPanel = ({ node, parentNode, layer }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Parent Style Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <div>Layer: {layer}</div>
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
      <div className="p-4 bg-gray-100 rounded-lg">
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
      <div className="p-4 bg-gray-100 rounded-lg">
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
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleLinkPanel = ({ node }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Style Link</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
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
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({ node, containerNode, outerContainerNode, parentNode }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Factory function to get the appropriate panel
const getPanel = (
  action: string,
  clickedNode: FlatNode | null,
  paneNode?: FlatNode,
  childNodes: FlatNode[] = [],
  layer?: number
): ReactElement | null => {
  // Find Markdown child node if it exists
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const markdownNode = childNodes.find((node) => node.nodeType === "Markdown");

  // Early return if we don't have required nodes
  if (!clickedNode && action !== "style-parent") return null;

  switch (action) {
    case "style-break":
      return clickedNode ? <StyleBreakPanel node={clickedNode} parentNode={paneNode} /> : null;
    case "style-parent":
      return markdownNode ? (
        <StyleParentPanel node={markdownNode} parentNode={paneNode} layer={layer} />
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

const SettingsPanel = () => {
  const signal = useStore(settingsPanelStore);
  if (!signal) return null;

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  // Get the clicked node
  const clickedNode = allNodes.get(signal.nodeId) as FlatNode | undefined;
  if (!clickedNode) return null;

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

  let panel;
  // Special Case (click wasn't registered on markdown due to margins)
  if (clickedNode.nodeType === "Pane") {
    panel = getPanel(signal.action, null, paneNode, childNodes, 1);
  } else {
    panel = getPanel(signal.action, clickedNode, paneNode, childNodes, signal.layer);
  }

  if (!panel) return null;

  return (
    <div className="fixed bottom-0 right-0 flex flex-col items-start">
      <button
        onClick={() => settingsPanelStore.set(null)}
        className="mb-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Close settings panel"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      <div className="bg-white shadow-lg w-full md:w-[500px] rounded-t-xl">
        <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
          <div className="p-6">{panel}</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
