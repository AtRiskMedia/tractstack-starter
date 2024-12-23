import type { NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";

export const NodeText = (props: NodeProps) => {
  const node = allNodes.get().get(props.id) as FlatNode;
  return (
    <>
      {node && node.copy}
    </>
  )
}