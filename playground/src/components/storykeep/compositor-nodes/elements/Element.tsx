import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs } from "@/store/nodes.ts";

export const Element = (props: NodeProps) => {
  return (
    <div className="h-10 p-10 bg-red-400">
      <span>Element <b>{props.id}</b></span>
      {getChildNodeIDs(props.id).map((id: string) => (
        <Node id={id} key={id} />
      ))}
    </div>
  );
}