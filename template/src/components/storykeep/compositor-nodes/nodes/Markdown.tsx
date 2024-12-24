import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { allNodes, getChildNodeIDs, getNodeClasses } from "@/store/nodes.ts";
import type { MarkdownPaneFragmentNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";

export const Markdown = (props: NodeProps) => {
  const id = props.id;
  const node = allNodes.get().get(props.id) as MarkdownPaneFragmentNode;
  let nodesToRender = <>
    {getChildNodeIDs(props.id).map((id: string) => (
      <Node id={id} key={id} />
    ))}
  </>;
  if(node.parentClasses) {
    for (let i = 0; i < node.parentClasses?.length; ++i) {
      nodesToRender = <div className={
        getNodeClasses(
          id,
          viewportStore.get().value,
          node.parentClasses?.length-i
        )
      }>
        {nodesToRender}
      </div>;
    }
  }
  return (nodesToRender);
}