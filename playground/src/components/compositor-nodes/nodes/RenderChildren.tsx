import Node from "@/components/compositor-nodes/Node.tsx";
import type { NodeProps } from "@/types";
import type { ReactNodesRendererProps } from "@/components/compositor-nodes/ReactNodesRenderer.tsx";

export type RenderChildrenProps = {
  children: string[];
  nodeProps: NodeProps | ReactNodesRendererProps;
};

export const RenderChildren = (props: RenderChildrenProps) => {
  const { children, nodeProps } = props;
  return (
    <>
      {children.map((id: string) => (
        <Node nodeId={id} key={id} ctx={nodeProps.ctx} />
      ))}
    </>
  );
};
