import type { CSSProperties } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import type { FlatNode, NodeProps } from "@/types";

export const NodeAnchorComponent = (props: NodeProps, tagName: string) => {
  const nodeId = props.nodeId;
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(nodeId);
  const childNodeIDs = ctx.getChildNodeIDs(node?.parentId ?? "");

  // Get previous and next siblings for spacing logic
  const currentIndex = childNodeIDs.indexOf(nodeId);
  const nextNode =
    currentIndex < childNodeIDs.length - 1
      ? (ctx.allNodes.get().get(childNodeIDs[currentIndex + 1]) as FlatNode)
      : null;

  // Only add spaces if needed for separation
  const needsTrailingSpace =
    nextNode &&
    nextNode.tagName === "text" &&
    !(
      nextNode.copy?.startsWith(".") ||
      nextNode.copy?.startsWith(",") ||
      nextNode.copy?.startsWith(";") ||
      nextNode.copy?.startsWith(":")
    );

  // Define the invisible marker style with explicit typing
  const invisibleStyle: CSSProperties = {
    fontSize: 0,
    color: "transparent",
    position: "absolute",
    pointerEvents: "none",
  };

  // We're using the actual element type (a or button) instead of createElement for better control
  if (tagName === "a") {
    return (
      <>
        <a
          className={ctx.getNodeClasses(nodeId, viewportKeyStore.get().value)}
          href={(node as FlatNode).href}
          onClick={(e) => {
            ctx.setClickedNodeId(nodeId);
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            ctx.setClickedNodeId(nodeId, true);
            e.stopPropagation();
          }}
          data-space-protected="true"
        >
          <RenderChildren children={ctx.getChildNodeIDs(nodeId)} nodeProps={props} />
          <span style={invisibleStyle} className="space-marker">
            ​
          </span>
        </a>
        {needsTrailingSpace && " "}
      </>
    );
  } else {
    return (
      <>
        <button
          className={ctx.getNodeClasses(nodeId, viewportKeyStore.get().value)}
          onClick={(e) => {
            ctx.setClickedNodeId(nodeId);
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            ctx.setClickedNodeId(nodeId, true);
            e.stopPropagation();
          }}
          data-space-protected="true"
        >
          <RenderChildren children={ctx.getChildNodeIDs(nodeId)} nodeProps={props} />
          <span style={invisibleStyle} className="space-marker">
            ​
          </span>
        </button>
        {needsTrailingSpace && " "}
      </>
    );
  }
};
