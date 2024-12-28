import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs } from "@/store/nodes.ts";

export const Root = (props: NodeProps) => {
  return (
    <div>
      {/*<span>*/}
      {/*  Root <b>{props.nodeId}</b>*/}
      {/*</span>*/}
      {getChildNodeIDs(props.nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </div>
  );
};
