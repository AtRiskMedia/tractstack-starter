import { getCtx } from "@/store/nodes.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { type NodeProps } from "@/types";

export const TagElement = (props: NodeProps) => {
  return (
    <>
      <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)} nodeProps={props} />
    </>
  );
};
