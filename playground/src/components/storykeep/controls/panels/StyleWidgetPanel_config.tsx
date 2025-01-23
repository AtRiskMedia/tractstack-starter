import { widgetMeta } from "@/constants";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { isWidgetNode } from "@/utils/nodes/type-guards";
import type { FlatNode } from "@/types";

// Widget imports
import YouTubeWidget from "../widgets/YouTubeWidget";
import BunnyWidget from "../widgets/BunnyWidget";
import SignupWidget from "../widgets/SignupWidget";
import BeliefWidget from "../widgets/BeliefWidget";
import IdentifyAsWidget from "../widgets/IdentifyAsWidget";
import ToggleWidget from "../widgets/ToggleWidget";

interface StyleWidgetConfigPanelProps {
  node: FlatNode;
}

function createUpdatedWidget(widgetNode: FlatNode, newCopy: string, newParams: string[]) {
  return {
    id: widgetNode.id,
    parentId: widgetNode.parentId,
    nodeType: widgetNode.nodeType,
    tagName: "code" as const,
    copy: newCopy,
    codeHookParams: newParams,
    isChanged: true,
  };
}

function StyleWidgetConfigPanel({ node }: StyleWidgetConfigPanelProps) {
  if (!isWidgetNode(node)) return null;

  const widgetId = node.copy?.substring(0, node.copy.indexOf("("));
  const meta = widgetId && widgetMeta[widgetId];
  if (!meta) return null;

  const handleUpdate = (newParams: string[]) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const widgetNode = allNodes.get(node.id);
    if (!widgetNode || !isWidgetNode(widgetNode) || !widgetId) return;

    const paramStrings = newParams.map((param) => param.toString());
    const newCopy = `${widgetId}(${paramStrings.join("|")})`;

    ctx.modifyNodes([createUpdatedWidget(widgetNode, newCopy, newParams)]);
  };

  const handleClose = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-widget",
      expanded: true,
    });
  };

  const renderWidget = () => {
    switch (widgetId) {
      case "youtube":
        return <YouTubeWidget node={node} onUpdate={handleUpdate} />;
      case "bunny":
        return <BunnyWidget node={node} onUpdate={handleUpdate} />;
      case "signup":
        return <SignupWidget node={node} onUpdate={handleUpdate} />;
      case "belief":
        return <BeliefWidget node={node} onUpdate={handleUpdate} />;
      case "identifyAs":
        return <IdentifyAsWidget node={node} onUpdate={handleUpdate} />;
      case "toggle":
        return <ToggleWidget node={node} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="my-4">
      <div className="space-y-4 max-w-md min-w-80">
        <div className="flex flex-row flex-nowrap justify-between">
          <h2 className="text-xl font-bold">{meta.title}</h2>
          <button
            className="text-cyan-700 hover:text-black"
            title="Return to preview pane"
            onClick={handleClose}
          >
            Go Back
          </button>
        </div>
        {renderWidget()}
      </div>
    </div>
  );
}

export default StyleWidgetConfigPanel;
