import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";

export const TagElement = (props: NodeProps) => {
  return (
    <>
      {getCtx(props)
        .getChildNodeIDs(props.nodeId)
        .map((id: string) => (
          <Node nodeId={id} key={id} ctx={props.ctx} />
        ))}
    </>
  );
};
