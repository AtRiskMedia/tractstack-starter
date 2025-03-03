import { memo, useState } from "react";
import { toolAddModes, toolAddModesIcons, toolAddModeTitles } from "@/constants.ts";
import { settingsPanelStore } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import { getTemplateNode } from "@/utils/common/nodesHelper.ts";
import type { NodeProps, ToolAddMode, FlatNode, Tag } from "@/types";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { toTag } from "@/utils/nodes/type-guards";

type GhostInsertBlockProps = NodeProps & {
  isEmpty: boolean;
  lastChildId: string | null;
};

export const GhostInsertBlock = memo((props: GhostInsertBlockProps) => {
  const { isEmpty, lastChildId } = props;
  const [showInsertOptions, setShowInsertOptions] = useState(false);

  const checkAllowInsert = (targetId: string, newTagName: ToolAddMode): boolean => {
    if (!targetId) return true; // If no target (empty), insertion is allowed

    const targetNode = getCtx(props).allNodes.get().get(targetId) as FlatNode;
    if (!targetNode || !("tagName" in targetNode)) {
      return false;
    }

    // Get child nodes to check insertion context
    const markdownId = props.nodeId;
    const tagNameIds = getCtx(props).getChildNodeIDs(markdownId);

    // Convert to Tag types for proper allowInsert checking
    const tagNames = tagNameIds
      .map((id) => {
        const name = getCtx(props).getNodeTagName(id);
        return toTag(name);
      })
      .filter((name): name is Tag => name !== null);

    const offset = tagNameIds.indexOf(targetId);
    const tagName = toTag(targetNode.tagName as string);
    const addTagName = toTag(newTagName);

    if (!tagName || !addTagName) {
      return false;
    }

    // Check insertion position constraints
    const allowInsertAfter =
      tagNames.length > offset
        ? getCtx(props).allowInsert(targetId, newTagName).allowInsertAfter
        : getCtx(props).allowInsert(targetId, newTagName).allowInsertAfter;

    return allowInsertAfter;
  };

  const handleInsert = (mode: ToolAddMode, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling

    const templateNode = getTemplateNode(mode);
    let newNodeId: string | null = null;

    try {
      if (isEmpty) {
        newNodeId = getCtx(props).addTemplateNode(props.nodeId, templateNode);
      } else if (lastChildId) {
        // Check if we're allowed to insert after this specific node
        const canInsert = checkAllowInsert(lastChildId, mode);

        if (canInsert) {
          // Use the correct target for insertion
          newNodeId = getCtx(props).addTemplateNode(
            lastChildId,
            templateNode,
            lastChildId,
            "after"
          );
        } else {
          // Fallback: Try to add to the parent directly
          newNodeId = getCtx(props).addTemplateNode(props.nodeId, templateNode);
        }
      }

      // Signal the appropriate handler for this node type
      if (newNodeId && templateNode.tagName) {
        getCtx(props).handleInsertSignal(templateNode.tagName, newNodeId);
      }
    } catch (error) {
      // Silent error handling
    }

    setShowInsertOptions(false);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInsertOptions(false);
  };

  // Element selection buttons - text elements and non-text elements with proper differentiation
  const ElementButtons = () => (
    <div className="grid grid-cols-3 gap-2 p-2">
      {toolAddModes
        .filter((mode) => mode !== "p" && mode !== "h2" && mode !== "h3" && mode !== "h4")
        .map((mode) => (
          <button
            key={mode}
            onClick={(e) => {
              e.stopPropagation();
              handleInsert(mode, e);
            }}
            className="p-2 border rounded hover:bg-cyan-50 hover:border-cyan-300 flex flex-col items-center"
          >
            {toolAddModesIcons[mode] ? (
              <img
                src={`/icons/${toolAddModesIcons[mode]}`}
                alt={toolAddModeTitles[mode]}
                className="w-8 h-8 mb-1"
              />
            ) : (
              <span className="text-3xl mb-1">+</span>
            )}
            <span className="text-xs font-bold">{toolAddModeTitles[mode]}</span>
          </button>
        ))}
    </div>
  );

  // Basic text elements options
  const TextElementButtons = () => (
    <div className="flex space-x-2 p-2">
      {["p", "h2", "h3", "h4"].map((mode) => (
        <button
          key={mode}
          onClick={(e) => {
            e.stopPropagation();
            handleInsert(mode as ToolAddMode, e);
          }}
          className="px-3 py-2 border rounded hover:bg-cyan-50 hover:border-cyan-300"
        >
          {toolAddModeTitles[mode as ToolAddMode]}
        </button>
      ))}
    </div>
  );

  // Empty state display
  if (isEmpty) {
    return (
      <div className="my-4">
        {showInsertOptions ? (
          <div className="border-2 border-dashed border-cyan-600 rounded-lg bg-white p-4 relative">
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
            <div className="text-center mb-3 text-gray-700 font-bold">Add content</div>
            <TextElementButtons />
            <div className="text-center my-2 text-gray-500 text-sm">or</div>
            <ElementButtons />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              settingsPanelStore.set(null);
              setShowInsertOptions(true);
            }}
            className="w-full p-6 border-2 border-dashed border-cyan-600 rounded-lg hover:bg-cyan-50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-2 bg-cyan-100 rounded-full">
                <PlusIcon className="h-6 w-6 text-cyan-700" />
              </div>
              <div className="text-gray-600">Add content</div>
            </div>
          </button>
        )}
      </div>
    );
  }

  // Non-empty state - show a button to add more content
  return (
    <div className="my-4">
      {showInsertOptions ? (
        <div className="border-2 border-dashed border-cyan-600 rounded-lg bg-white p-4 relative">
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
            title="Close"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </button>
          <div className="text-center mb-3 text-gray-700 font-bold">Add content</div>
          <TextElementButtons />
          <div className="text-center my-2 text-gray-500 text-sm">or</div>
          <ElementButtons />
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling
            settingsPanelStore.set(null);
            setShowInsertOptions(true);
          }}
          className="w-full py-3 border border-dashed border-cyan-600 rounded hover:bg-cyan-50 transition-colors"
        >
          <div className="flex items-center justify-center space-x-2">
            <PlusIcon className="h-5 w-5 text-cyan-700" />
            <span className="text-sm text-gray-600">Add new element</span>
          </div>
        </button>
      )}
    </div>
  );
});
