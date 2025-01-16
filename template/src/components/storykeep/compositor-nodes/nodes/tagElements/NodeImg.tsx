import type { NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const NodeImg = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;

  return (
    <img
      src={node.src}
      {...(node.srcSet ? { srcSet: node.srcSet } : {})}
      className={getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}
      alt={node.alt}
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId, true);
        e.stopPropagation();
      }}
    />
  );
};
