import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const NodeUl = (props: NodeProps) => {
  return (
    <ul className={getNodeClasses(props.id, viewportStore.get().value)}>
      {getChildNodeIDs(props.id).map((id: string) => (
        <Node id={id} key={id} />
      ))}
    </ul>
  )
}