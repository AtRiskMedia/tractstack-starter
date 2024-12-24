import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes, getChildNodeIDs, getNodeClasses } from "@/store/nodes.ts";
import type { MarkdownPaneFragmentNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const Markdown = (props: NodeProps) => {
  const id = props.nodeId;
  const node = allNodes.get().get(props.nodeId) as MarkdownPaneFragmentNode;
  let nodesToRender = <>
    {getChildNodeIDs(props.nodeId).map((id: string) => (
      <Node nodeId={id} key={id} />
    ))}
  </>;
  if("parentCss" in node) {
    for (let i = (node.parentCss as string[])?.length; i > 0; --i) {
      nodesToRender = <div className={
        getNodeClasses(
          id,
          viewportStore.get().value,
          i-1
        )
      }>
        {nodesToRender}
      </div>;
    }
  }
  return (nodesToRender);
}