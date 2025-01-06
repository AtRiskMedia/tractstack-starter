import type { BasePanelProps } from "../SettingsPanel";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import type { MarkdownPaneFragmentNode } from "../../../../types";

const StyleParentRemovePanel = ({ node, layer, className }: BasePanelProps) => {
  if (!className) return null;

  const friendlyName = tailwindClasses[className]?.title || className;

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        nodeId: node.id,
        layer: layer,
        action: `style-parent`,
      });
  };

  const handleYesClick = () => {
    if (!node || !className || !layer) {
      console.error("Missing required properties for class removal");
      return;
    }
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const markdownNode = allNodes.get(node.id) as MarkdownPaneFragmentNode;
    if (!markdownNode || !markdownNode.parentClasses) return;
    const layerIndex = layer - 1;
    const layerClasses = markdownNode.parentClasses[layerIndex];
    if (!layerClasses) return;
    // Remove the class from each viewport if it exists
    if (className in layerClasses.mobile) delete layerClasses.mobile[className];
    if (className in layerClasses.tablet) delete layerClasses.tablet[className];
    if (className in layerClasses.desktop) delete layerClasses.desktop[className];
    // Update the node in the store
    const newNodes = new Map(allNodes);
    newNodes.set(node.id, { ...markdownNode, isChanged: true });
    ctx.allNodes.set(newNodes);
    // Notify parent of changes
    if (node.parentId) {
      ctx.notifyNode(node.parentId);
    }
    resetStore();
  };

  const handleNoClick = () => {
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        Remove <span className="font-bold">{friendlyName}</span>?
      </h2>
      <div className="space-y-4 rounded p-6 bg-slate-50">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
          <li>
            <em>Are you sure?</em>
          </li>
          <li>
            <button onClick={handleYesClick} className="hover:text-black underline font-bold">
              Yes
            </button>
          </li>
          <li>
            <button onClick={handleNoClick} className="hover:text-black underline font-bold">
              No / Cancel
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StyleParentRemovePanel;
