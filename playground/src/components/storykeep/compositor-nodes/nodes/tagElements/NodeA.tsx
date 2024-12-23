import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes, getChildNodeIDs, getNodeClasses } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const NodeA = (props: NodeProps) => {
  const node = allNodes.get().get(props.id) as FlatNode;
  return (
    <a href={node.href}
       className={getNodeClasses(props.id, viewportStore.get().value)}>
      {getChildNodeIDs(props.id).map((id: string) => (
        <Node id={id} key={id} />
      ))}
    </a>
  );
}