import type { NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes, getNodeClasses } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const NodeImg = (props: NodeProps) => {
  const node = allNodes.get().get(props.nodeId) as FlatNode;

  return (
    <img
      src={node.src}
      {...(node.srcSet ? { srcSet: node.srcSet } : {})}
      className={getNodeClasses(props.nodeId, viewportStore.get().value)}
      alt={node.alt}
    />
  );
};
