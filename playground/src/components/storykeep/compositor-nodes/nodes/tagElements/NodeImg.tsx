import type { NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes, getNodeClasses } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const NodeImg = (props: NodeProps) => {
  const node = allNodes.get().get(props.id) as FlatNode;
  return (
    <img src="/static.jpg" className={getNodeClasses(props.id, viewportStore.get().value)} alt={node.alt} />
  );
}