import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes, getChildNodeIDs } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";

export const NodeA = (props: NodeProps) => {
  const node = allNodes.get().get(props.id) as FlatNode;
  return (
    <a href={node.href}>
      {getChildNodeIDs(props.id).map((id: string) => (
        <Node id={id} key={id} />
      ))}
    </a>
  );
}