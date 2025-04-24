import { type JSX } from "react";
import { getCtx } from "@/store/nodes.ts";
import { keyboardAccessible, viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import ArrowDownIcon from "@heroicons/react/24/outline/ArrowDownIcon";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import type { FlatNode, NodeProps } from "@/types.ts";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag_settings = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const node = getCtx(props).allNodes.get().get(nodeId) as FlatNode;
  const children = getCtx(props).getChildNodeIDs(props.nodeId);
  const Tag = props.tagName;

  const canMove = (/*direction: "before" | "after"*/): boolean => {
    console.log(`TODO-- wire into allowInsert for proper signal`);
    const hasCodeChildren = getCtx(props).getChildNodeByTagNames(nodeId, ["code"]);
    // only ul/ol can move code nodes
    if (hasCodeChildren && node.tagName === "li") {
      return false;
    }
    return true;
  };

  const SettingsButtons = () => (
    <div
      className={`absolute top-2 left-2 flex items-center gap-2 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity z-10`}
    >
      {canMove(/*"after"*/) && (
        <button onClick={() => getCtx().moveNode(nodeId, "after")}>
          <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
            <ArrowDownIcon className="w-6 h-6 mr-1" />
          </div>
        </button>
      )}
      {canMove(/*"before"*/) && (
        <button onClick={() => getCtx().moveNode(nodeId, "before")}>
          <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
            <ArrowUpIcon className="w-6 h-6 mr-1" />
          </div>
        </button>
      )}
    </div>
  );

  return (
    <div className="relative group">
      <div className="relative">
        <div className="absolute inset-0">
          <div className="h-full w-full outline outline-4 outline-dashed outline-cyan-600 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100" />
        </div>
        <SettingsButtons />
        <Tag
          className={`${getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)} pt-12`}
        >
          <RenderChildren children={children} nodeProps={props} />
        </Tag>
      </div>
    </div>
  );
};
