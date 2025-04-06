import Node from "@/components/compositor-nodes/Node.tsx";
import { timestampNodeId } from "@/utils/common/helpers.ts";
import type { NodeProps } from "@/types";
import type { ReactNodesRendererProps } from "@/components/compositor-nodes/ReactNodesRenderer.tsx";

export type RenderChildrenProps = {
  children: string[];
  nodeProps: NodeProps | ReactNodesRendererProps;
};

export const RenderChildren = (props: RenderChildrenProps) => {
  const { children, nodeProps } = props;
  console.log(`Rendering RenderChildren`, children.at(0));
  return (
    <>
      {children.map((id: string) => (
        <Node nodeId={id} key={timestampNodeId(id)} ctx={nodeProps.ctx} />
      ))}
    </>
  );
};
