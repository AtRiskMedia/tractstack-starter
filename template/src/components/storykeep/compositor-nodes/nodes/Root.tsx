import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs } from "@/store/nodes.ts";

export const Root = (props: NodeProps) => {
  return (
    <div>
      {/*<span>*/}
      {/*  Root <b>{props.id}</b>*/}
      {/*</span>*/}
      {getChildNodeIDs(props.id).map((id: string) => (
        <Node id={id} key={id} />
      ))}
    </div>
  );
}