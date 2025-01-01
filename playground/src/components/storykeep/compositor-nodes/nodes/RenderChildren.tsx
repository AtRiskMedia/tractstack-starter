import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { timestampNodeId } from "@/utils/common/helpers.ts";
import type { ReactNodesRendererProps } from "@/components/storykeep/compositor-nodes/ReactNodesRenderer.tsx";

export type RenderChildrenProps = {
  children: string[];
  nodeProps: NodeProps | ReactNodesRendererProps;
};

export const RenderChildren = (props: RenderChildrenProps) => {
  const { children, nodeProps } = props;
  return (
    <>
      {children.map((id: string) => (
        <Node nodeId={id} key={timestampNodeId(id)} ctx={nodeProps.ctx} />
      ))}
    </>
  );
};
