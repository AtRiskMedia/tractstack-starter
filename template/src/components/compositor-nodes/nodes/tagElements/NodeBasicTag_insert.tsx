import { getCtx } from "@/store/nodes.ts";
import { keyboardAccessible, toolAddModeStore, viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { type JSX, type MouseEvent } from "react";
import type { NodeProps } from "@/types";
import { tagTitles } from "@/constants";
import { getTemplateNode } from "@/utils/common/nodesHelper.ts";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTagInsert = (props: NodeTagProps) => {
  const { value: toolAddMode } = toolAddModeStore.get();
  const nodeId = props.nodeId;
  const { allowInsertBefore, allowInsertAfter } =
    props.tagName !== "li"
      ? getCtx(props).allowInsert(nodeId, toolAddMode)
      : getCtx(props).allowInsertLi(nodeId, toolAddMode);
  const children = getCtx(props).getChildNodeIDs(props.nodeId);

  const Tag = props.tagName;
  const newTagTitle = tagTitles[toolAddMode];

  const handleInsertAbove = (e: MouseEvent) => {
    e.stopPropagation();
    const templateNode = getTemplateNode(toolAddModeStore.get().value);
    const newNodeId = getCtx(props).addTemplateNode(
      props.nodeId,
      templateNode,
      props.nodeId,
      "before"
    );
    if (newNodeId && templateNode.tagName) handleInsertSignal(templateNode.tagName, newNodeId);
  };

  const handleInsertBelow = (e: MouseEvent) => {
    e.stopPropagation();
    const templateNode = getTemplateNode(toolAddModeStore.get().value);
    const newNodeId = getCtx(props).addTemplateNode(
      props.nodeId,
      templateNode,
      props.nodeId,
      "after"
    );
    if (newNodeId && templateNode.tagName) handleInsertSignal(templateNode.tagName, newNodeId);
  };

  const handleInsertSignal = (tagName: string, nodeId: string) => {
    getCtx(props).handleInsertSignal(tagName, nodeId);
  };

  const handleClickIntercept = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const InsertButtons = () => (
    <div
      className={`absolute top-2 left-2 flex items-center gap-2 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity z-10`}
    >
      {(allowInsertBefore || allowInsertAfter) && (
        <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">
          Insert {newTagTitle}
        </div>
      )}
      {allowInsertBefore && (
        <button
          onClick={handleInsertAbove}
          className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
        >
          + Above
        </button>
      )}
      {allowInsertAfter && (
        <button
          onClick={handleInsertBelow}
          className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10"
        >
          + Below
        </button>
      )}
      {!allowInsertBefore && !allowInsertAfter && (
        <button
          className="px-2 py-1 bg-white text-cyan-700 text-sm rounded shadow-sm transition-colors opacity-50"
          disabled={true}
        >
          + Can't Insert {newTagTitle} Here
        </button>
      )}
    </div>
  );

  return (
    <div className="relative group">
      <div className="relative">
        {/* Click interceptor layer */}
        <div
          className="absolute inset-0 z-10"
          onClick={handleClickIntercept}
          onMouseDown={handleClickIntercept}
          onMouseUp={handleClickIntercept}
        />
        <div className="absolute inset-0">
          <div className="h-full w-full outline outline-4 outline-dashed mix-blend-difference outline-cyan-600 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100" />
        </div>
        <InsertButtons />
        <Tag
          className={`${getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)} pt-12`}
        >
          <RenderChildren children={children} nodeProps={props} />
        </Tag>
      </div>
    </div>
  );
};
