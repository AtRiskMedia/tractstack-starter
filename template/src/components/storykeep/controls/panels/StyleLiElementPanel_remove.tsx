import type { BasePanelProps } from "../SettingsPanel";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import type { FlatNode, MarkdownPaneFragmentNode } from "../../../../types";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";

const StyleLiElementRemovePanel = ({ node, parentNode, className, childId }: BasePanelProps) => {
  if (!className || !node?.tagName || !parentNode || !isMarkdownPaneFragmentNode(parentNode))
    return null;

  const friendlyName = tailwindClasses[className]?.title || className;
  const isContainer = node.tagName === "ul" || node.tagName === "ol";

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        action: isContainer ? "style-li-container" : "style-li-element",
        nodeId: isContainer && typeof childId === `string` ? childId : node.id,
      });
  };

  const handleYesClick = () => {
    if (!node || !className) {
      console.error("Missing required properties for class removal");
      return;
    }

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();

    // Get mutable copies of both nodes
    const elementNode = allNodes.get(node.id) as FlatNode;
    const markdownNode = allNodes.get(parentNode.id) as MarkdownPaneFragmentNode;

    if (!elementNode || !markdownNode) return;

    // Remove from defaultClasses if present
    if (markdownNode.defaultClasses?.[node.tagName]) {
      const defaultClasses = markdownNode.defaultClasses[node.tagName];
      if (className in defaultClasses.mobile) delete defaultClasses.mobile[className];
      if (className in defaultClasses.tablet) delete defaultClasses.tablet[className];
      if (className in defaultClasses.desktop) delete defaultClasses.desktop[className];
    }

    // Remove from overrideClasses if present
    if (elementNode.overrideClasses) {
      if (elementNode.overrideClasses.mobile && className in elementNode.overrideClasses.mobile) {
        delete elementNode.overrideClasses.mobile[className];
      }
      if (elementNode.overrideClasses.tablet && className in elementNode.overrideClasses.tablet) {
        delete elementNode.overrideClasses.tablet[className];
      }
      if (elementNode.overrideClasses.desktop && className in elementNode.overrideClasses.desktop) {
        delete elementNode.overrideClasses.desktop[className];
      }
    }

    // Update both nodes in the store
    const newNodes = new Map(allNodes);
    newNodes.set(node.id, { ...elementNode, isChanged: true });
    newNodes.set(parentNode.id, { ...markdownNode, isChanged: true });
    ctx.allNodes.set(newNodes);

    // Notify parent of changes
    if (parentNode.id) {
      ctx.notifyNode(parentNode.id);
    }

    resetStore();
  };

  const handleNoClick = () => {
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        Remove <span className="font-bold">{friendlyName}</span>
        {isContainer ? " from Container" : " from List Item"}?
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

export default StyleLiElementRemovePanel;
