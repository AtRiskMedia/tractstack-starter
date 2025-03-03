import { memo, useMemo, useState } from "react";
import { toolAddModes, toolAddModesIcons, toolAddModeTitles } from "@/constants";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { getTemplateNode } from "@/utils/common/nodesHelper";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import allowInsert from "@/utils/nodes/allowInsert";
import type { NodeProps, ToolAddMode, FlatNode, Tag } from "@/types";

type GhostInsertBlockProps = NodeProps & {
  isEmpty: boolean;
  lastChildId: string | null;
};

export const GhostInsertBlock = memo((props: GhostInsertBlockProps) => {
  const { isEmpty, lastChildId } = props;
  const [showInsertOptions, setShowInsertOptions] = useState(false);

  const parentNode = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  const lastChildNode = lastChildId
    ? (getCtx(props).allNodes.get().get(lastChildId) as FlatNode)
    : null;

  const allowedModes = useMemo(() => {
    const contextNode = isEmpty ? parentNode : lastChildNode;
    if (!contextNode) return [];
    return toolAddModes.filter((mode) =>
      typeof contextNode.tagName === `string`
        ? allowInsert(contextNode, contextNode.tagName as Tag, mode as Tag, undefined)
        : false
    );
  }, [isEmpty, lastChildId, parentNode, lastChildNode]);

  const handleInsert = (mode: ToolAddMode, e: React.MouseEvent) => {
    e.stopPropagation();
    const templateNode = getTemplateNode(mode);
    let newNodeId: string | null = null;
    try {
      if (isEmpty) {
        if (!allowedModes.includes(mode)) {
          console.warn(`Insertion of ${mode} not allowed in empty container`);
          return;
        }
        newNodeId = getCtx(props).addTemplateNode(props.nodeId, templateNode);
      } else if (lastChildId && lastChildNode) {
        if (!allowedModes.includes(mode)) {
          console.warn(`Insertion of ${mode} after ${lastChildNode.tagName} not allowed`);
          return;
        }
        newNodeId = getCtx(props).addTemplateNode(lastChildId, templateNode, lastChildId, "after");
      }
      if (newNodeId && templateNode.tagName) {
        getCtx(props).handleInsertSignal(templateNode.tagName, newNodeId);
      }
    } catch (error) {
      console.error("Insertion failed:", error);
    }
    setShowInsertOptions(false);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInsertOptions(false);
  };

  const TextElementButtons = () => (
    <div className="flex flex-wrap gap-2 p-2">
      {["p", "h2", "h3", "h4"]
        .filter((mode) => allowedModes.includes(mode as ToolAddMode))
        .map((mode) => (
          <button
            key={mode}
            onClick={(e) => handleInsert(mode as ToolAddMode, e)}
            className="px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded shadow-sm hover:bg-cyan-600 hover:text-white hover:border-cyan-700 transition-colors"
          >
            {toolAddModeTitles[mode as ToolAddMode]}
          </button>
        ))}
    </div>
  );

  const ElementButtons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
      {toolAddModes
        .filter((mode) => !["p", "h2", "h3", "h4"].includes(mode))
        .filter((mode) => allowedModes.includes(mode))
        .map((mode) => (
          <button
            key={mode}
            onClick={(e) => handleInsert(mode, e)}
            className="p-2 bg-white text-gray-800 border border-gray-300 rounded shadow-sm hover:bg-cyan-600 hover:text-white hover:border-cyan-700 transition-colors flex flex-col items-center"
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

  // Check if there are any allowed non-text elements
  const hasAllowedElements = toolAddModes
    .filter((mode) => !["p", "h2", "h3", "h4"].includes(mode))
    .some((mode) => allowedModes.includes(mode));

  if (isEmpty) {
    return (
      <div className="my-4">
        {showInsertOptions ? (
          <div className="bg-white text-gray-800 border-2 border-cyan-600 rounded-lg shadow-lg p-3">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="font-bold text-lg">Add content</h3>
              <button
                onClick={handleClose}
                className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                title="Close"
              >
                <XMarkIcon className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <TextElementButtons />
            {hasAllowedElements && (
              <>
                <div className="text-center my-2 text-gray-500 text-sm">or</div>
                <ElementButtons />
              </>
            )}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              settingsPanelStore.set(null);
              setShowInsertOptions(true);
            }}
            className="w-full p-6 border-2 border-dashed border-cyan-500 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors group dark:bg-cyan-900 dark:border-cyan-600 dark:hover:bg-cyan-800"
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-2 bg-cyan-100 rounded-full group-hover:bg-cyan-200 dark:bg-cyan-800 dark:group-hover:bg-cyan-700">
                <PlusIcon className="h-6 w-6 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div className="font-medium text-cyan-800 dark:text-cyan-300">Add content</div>
            </div>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="my-4">
      {showInsertOptions ? (
        <div className="bg-white text-gray-800 border-2 border-cyan-600 rounded-lg shadow-lg p-3">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h3 className="font-bold text-lg">Add content</h3>
            <button
              onClick={handleClose}
              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5 text-gray-700" />
            </button>
          </div>
          <TextElementButtons />
          {hasAllowedElements && (
            <>
              <div className="text-center my-2 text-gray-500 text-sm">or</div>
              <ElementButtons />
            </>
          )}
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            settingsPanelStore.set(null);
            setShowInsertOptions(true);
          }}
          className="w-full py-3 border border-dashed border-cyan-500 bg-cyan-50 rounded hover:bg-cyan-100 transition-colors group dark:bg-cyan-900 dark:border-cyan-600 dark:hover:bg-cyan-800"
        >
          <div className="flex items-center justify-center space-x-2">
            <PlusIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
            <span className="text-sm font-medium text-cyan-800 dark:text-cyan-300">
              Add new element
            </span>
          </div>
        </button>
      )}
    </div>
  );
});
