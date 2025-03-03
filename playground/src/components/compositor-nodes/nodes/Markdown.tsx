import { useEffect, useState } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { GhostInsertBlock } from "./GhostInsertBlock";
import { type NodeProps } from "@/types";
import type { MarkdownPaneFragmentNode, ParentClassesPayload } from "@/types.ts";

export const Markdown = (props: NodeProps) => {
  const id = props.nodeId;
  const node = getCtx(props).allNodes.get().get(props.nodeId) as MarkdownPaneFragmentNode;
  const isPreview = getCtx(props).rootNodeId.get() === `tmp`;
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

  // Determine whether this Markdown container is empty
  const isEmpty = children.length === 0;

  // Get the last child element for appending new elements
  const lastChildId = children.length > 0 ? children[children.length - 1] : null;

  // Prepare the rendering content with children and, if appropriate, the GhostInsertBlock
  let nodesToRender = (
    <>
      <RenderChildren children={children} nodeProps={props} />
      {!isPreview && (
        <GhostInsertBlock
          nodeId={props.nodeId}
          ctx={props.ctx}
          isEmpty={isEmpty}
          lastChildId={lastChildId}
        />
      )}
    </>
  );

  // Apply parent classes/wrappers if they exist
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
