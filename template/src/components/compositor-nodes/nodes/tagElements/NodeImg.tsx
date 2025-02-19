import { getCtx } from "@/store/nodes.ts";
import type { FlatNode,NodeProps } from "@/types.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";

export const NodeImg = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;

  return (
    <img
      src={node.src}
      {...(node.srcSet ? { srcSet: node.srcSet } : {})}
      className={getCtx(props).getNodeClasses(props.nodeId, viewportKeyStore.get().value)}
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
