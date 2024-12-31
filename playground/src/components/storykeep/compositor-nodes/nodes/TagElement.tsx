import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";

export const TagElement = (props: NodeProps) => {
  return (
    <>
      <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)}
                      nodeProps={props}/>
    </>
  );
};
