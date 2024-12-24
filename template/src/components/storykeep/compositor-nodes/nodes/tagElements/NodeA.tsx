import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes, getChildNodeIDs, getNodeClasses } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const NodeA = (props: NodeProps) => {
  const node = allNodes.get().get(props.nodeId) as FlatNode;
  return (
    <a href={node.href}
       className={getNodeClasses(props.nodeId, viewportStore.get().value)}>
      {getChildNodeIDs(props.nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </a>
  );
}