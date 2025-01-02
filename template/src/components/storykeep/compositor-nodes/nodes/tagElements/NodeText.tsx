import type { NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";

export const NodeText = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  if (node) {
    return <>{node.copy && node.copy.trim() === `` ? "\u00A0 " : node.copy + " "}</>;
  } else {
    return <>ERROR MISSING NODE</>;
  }
};
