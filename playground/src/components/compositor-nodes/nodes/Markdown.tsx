import { useEffect, useState } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { type NodeProps } from "@/types"
import type { MarkdownPaneFragmentNode, ParentClassesPayload } from "@/types.ts";

export const Markdown = (props: NodeProps) => {
  const id = props.nodeId;
  const node = getCtx(props).allNodes.get().get(props.nodeId) as MarkdownPaneFragmentNode;
  const [children, setChildren] = useState<string[]>([
    ...getCtx(props).getChildNodeIDs(props.nodeId),
  ]);

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for markdown node: " + props.nodeId);
      setChildren([...getCtx(props).getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);
  //console.log("draw markdown: " + props.nodeId);
  let nodesToRender = <RenderChildren children={children} nodeProps={props} />;
  if ("parentClasses" in node) {
    for (let i = (node.parentClasses as ParentClassesPayload)?.length; i > 0; --i) {
      nodesToRender = (
        <div
          onClick={(e) => {
            getCtx(props).setClickedParentLayer(i);
            getCtx(props).setClickedNodeId(props.nodeId);
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            getCtx(props).setClickedParentLayer(i);
            getCtx(props).setClickedNodeId(props.nodeId, true);
            e.stopPropagation();
          }}
          className={getCtx(props).getNodeClasses(id, viewportKeyStore.get().value, i - 1)}
        >
          {nodesToRender}
        </div>
      );
    }
  }
  return <>{nodesToRender}</>;
};
