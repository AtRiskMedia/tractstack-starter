import type { BasePanelProps } from "../SettingsPanel";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import type { FlatNode } from "../../../../types";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleImageRemovePanel = ({ node, parentNode, className, childId }: BasePanelProps) => {
  if (!className || !node?.tagName || !parentNode || !isMarkdownPaneFragmentNode(parentNode)) {
    return null;
  }
  const friendlyName = tailwindClasses[className]?.title || className;
  const isOuterContainer = node.tagName === "ul" || node.tagName === "ol";
  const isContainer = node.tagName === "li";

  const elementTypeTitle = isOuterContainer
    ? "Outer Container"
    : isContainer
      ? "Container"
      : "Image";

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        action: "style-image",
        nodeId: isOuterContainer || isContainer ? childId || node.id : node.id,
      });
  };

  const handleYesClick = () => {
    if (!node || !className) {
      console.error("Missing required properties for class removal");
      return;
    }

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();

    const targetNode = cloneDeep(allNodes.get(node.id)) as FlatNode;

    if (!targetNode) return;

    // Remove from defaultClasses if present
    if (parentNode.defaultClasses?.[targetNode.tagName]) {
      const defaultClasses = parentNode.defaultClasses[targetNode.tagName];
      if (className in defaultClasses.mobile) delete defaultClasses.mobile[className];
      if (className in defaultClasses.tablet) delete defaultClasses.tablet[className];
      if (className in defaultClasses.desktop) delete defaultClasses.desktop[className];
    }

    // Remove from overrideClasses if present
    if (targetNode.overrideClasses) {
      if (targetNode.overrideClasses.mobile && className in targetNode.overrideClasses.mobile) {
        delete targetNode.overrideClasses.mobile[className];
      }
      if (targetNode.overrideClasses.tablet && className in targetNode.overrideClasses.tablet) {
        delete targetNode.overrideClasses.tablet[className];
      }
      if (targetNode.overrideClasses.desktop && className in targetNode.overrideClasses.desktop) {
        delete targetNode.overrideClasses.desktop[className];
      }

      // If there are no overrides left, remove the overrideClasses object
      const overrides = `overrideClasses` in targetNode && targetNode.overrideClasses;
      const hasRemainingOverrides =
        (overrides &&
          `mobile` in overrides &&
          typeof overrides.mobile !== `undefined` &&
          Object.keys(overrides.mobile).length > 0) ||
        (overrides &&
          `tablet` in overrides &&
          typeof overrides.tablet !== `undefined` &&
          Object.keys(overrides.tablet).length > 0) ||
        (overrides &&
          `desktop` in overrides &&
          typeof overrides.desktop !== `undefined` &&
          Object.keys(overrides.desktop).length > 0);

      if (!hasRemainingOverrides) {
        delete targetNode.overrideClasses;
      }
    }

    const parentNodeClone = cloneDeep(parentNode);

    // Update both nodes in the store
    ctx.modifyNodes([
      { ...targetNode, isChanged: true },
      { ...parentNodeClone, isChanged: true },
    ]);
    resetStore();
  };

  const handleNoClick = () => {
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        Remove <span className="font-bold">{friendlyName}</span>
        <span className="ml-1">from {elementTypeTitle}?</span>
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

export default StyleImageRemovePanel;
