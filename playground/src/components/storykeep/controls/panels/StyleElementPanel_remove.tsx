import { useEffect } from "react";
import type { BasePanelProps } from "../SettingsPanel";
import {
  styleElementInfoStore,
  resetStyleElementInfo,
  settingsPanelStore,
} from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { tailwindClasses } from "@/utils/tailwind/tailwindClasses";
import type { FlatNode, MarkdownPaneFragmentNode } from "@/types";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleElementRemovePanel = ({ node, parentNode, className }: BasePanelProps) => {
  if (!className || !node?.tagName) return null;

  const friendlyName = tailwindClasses[className]?.title || className;

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        nodeId: node.id,
        action: "style-element",
        expanded: true,
      });
  };

  const handleYesClick = () => {
    if (!node || !className || !parentNode || !isMarkdownPaneFragmentNode(parentNode)) {
      console.error("Missing required properties for class removal");
      return;
    }

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();

    // Get mutable copies of both nodes
    const elementNode = allNodes.get(node.id) as FlatNode;
    const markdownNode = cloneDeep(allNodes.get(parentNode.id) as MarkdownPaneFragmentNode);

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

    ctx.modifyNodes([
      { ...elementNode, isChanged: true },
      { ...markdownNode, isChanged: true },
    ]);
    resetStore();
  };

  const handleNoClick = () => {
    resetStore();
  };

  useEffect(() => {
    if (className && node?.tagName) {
      styleElementInfoStore.set({
        markdownParentId: parentNode?.id || null,
        tagName: node.tagName,
        overrideNodeId: null,
        className: className,
      });
    }

    return () => {
      resetStyleElementInfo();
    };
  }, [parentNode?.id, node?.tagName, className]);

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

export default StyleElementRemovePanel;
