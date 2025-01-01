import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";

export const NodeA = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  return (
    <a
      href={node.href}
      aria-disabled="true"
      className={`pointer-events-none ${getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}`}
    >
      <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)} nodeProps={props} />
    </a>
  );
};
