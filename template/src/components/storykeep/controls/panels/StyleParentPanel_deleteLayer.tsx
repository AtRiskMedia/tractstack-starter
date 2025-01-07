import type { BasePanelProps } from "../SettingsPanel";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import type { MarkdownPaneFragmentNode } from "../../../../types";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleParentDeleteLayerPanel = ({ node, layer }: BasePanelProps) => {
  if (!layer) return null;
  if (!node || !isMarkdownPaneFragmentNode(node)) return null;
  if (!node.parentClasses) return null;

  const layerIndex = layer - 1;
  if (layerIndex >= node.parentClasses.length) return null;

  const currentLayer = node.parentClasses[layerIndex];
  const allKeys = new Set([
    ...Object.keys(currentLayer.mobile || {}),
    ...Object.keys(currentLayer.tablet || {}),
    ...Object.keys(currentLayer.desktop || {}),
  ]);
  const count = allKeys.size;

  const resetStore = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-parent",
    });
  };

  const handleYesClick = () => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const markdownNode = allNodes.get(node.id) as MarkdownPaneFragmentNode;

    if (!markdownNode || !isMarkdownPaneFragmentNode(markdownNode)) return;
    if (!markdownNode.parentClasses) return;

    // If this is the last layer, replace with empty classes instead of removing
    if (markdownNode.parentClasses.length === 1) {
      const emptyLayer = {
        mobile: {},
        tablet: {},
        desktop: {},
      };

      const updatedNode: MarkdownPaneFragmentNode = cloneDeep({
        ...markdownNode,
        parentClasses: [emptyLayer],
        isChanged: true,
      });

      ctx.modifyNodes([updatedNode]);
      resetStore();
      return;
    }

    // Otherwise remove the layer
    const newParentClasses = [
      ...markdownNode.parentClasses.slice(0, layerIndex),
      ...markdownNode.parentClasses.slice(layerIndex + 1),
    ];

    const updatedNode: MarkdownPaneFragmentNode = cloneDeep({
      ...markdownNode,
      parentClasses: newParentClasses,
      isChanged: true,
    });

    ctx.modifyNodes([updatedNode]);
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        Remove Layer <span className="font-bold">{layer}</span>?
      </h2>
      <div className="space-y-4 rounded p-6 bg-slate-50">
        <p className="font-bold text-myorange">This layer has {count} classes.</p>
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
            <button onClick={resetStore} className="hover:text-black underline font-bold">
              No / Cancel
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StyleParentDeleteLayerPanel;
