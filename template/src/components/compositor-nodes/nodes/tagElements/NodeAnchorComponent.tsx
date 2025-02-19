import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import type { FlatNode,NodeProps } from "@/types"

export const NodeAnchorComponent = (props: NodeProps, tagName: string) => {
  const nodeId = props.nodeId;
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(nodeId);
  const childNodeIDs = ctx.getChildNodeIDs(node?.parentId ?? "");
  //const isFirstChild = childNodeIDs[0] === nodeId;
  //const isLastChild = childNodeIDs[childNodeIDs.length - 1] === nodeId;

  // Get previous and next siblings
  const currentIndex = childNodeIDs.indexOf(nodeId);
  //const prevNode =
  //  currentIndex > 0 ? (ctx.allNodes.get().get(childNodeIDs[currentIndex - 1]) as FlatNode) : null;
  const nextNode =
    currentIndex < childNodeIDs.length - 1
      ? (ctx.allNodes.get().get(childNodeIDs[currentIndex + 1]) as FlatNode)
      : null;

  // Only add spaces if needed for separation
  //const needsLeadingSpace = false;
  //prevNode && prevNode.tagName === "text" && !prevNode.copy?.endsWith(" ");
  const needsTrailingSpace =
    nextNode &&
    nextNode.tagName === "text" &&
    !(
      nextNode.copy?.startsWith(".") ||
      nextNode.copy?.startsWith(",") ||
      nextNode.copy?.startsWith(";") ||
      nextNode.copy?.startsWith(":")
    );

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
      >
        <RenderChildren children={ctx.getChildNodeIDs(nodeId)} nodeProps={props} />
      </a>
      {needsTrailingSpace && " "}
    </>
  );
};
