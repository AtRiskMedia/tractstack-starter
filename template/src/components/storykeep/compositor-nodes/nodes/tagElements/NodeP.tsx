import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const NodeP = (props: NodeProps) => {
  return (
    <p className={getNodeClasses(props.nodeId, viewportStore.get().value)}>
      {getChildNodeIDs(props.nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </p>
  )
}