import { useState, useEffect } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { GhostInsertBlock } from "./GhostInsertBlock";
import { type NodeProps } from "@/types";
import type { MarkdownPaneFragmentNode, ParentClassesPayload } from "@/types.ts";

export const Markdown = (props: NodeProps) => {
  const id = props.nodeId;
  const toolModeVal = getCtx(props).toolModeValStore.get().value;
  const node = getCtx(props).allNodes.get().get(props.nodeId) as MarkdownPaneFragmentNode;
  const isPreview = getCtx(props).rootNodeId.get() === `tmp`;
  const children = getCtx(props).getChildNodeIDs(props.nodeId);
  const isEmpty = children.length === 0;
  const lastChildId = children.length > 0 ? children[children.length - 1] : null;

  // Track the viewport value in state so we can react to changes
  const [currentViewport, setCurrentViewport] = useState(viewportKeyStore.get().value);

  // Subscribe to viewportKeyStore changes
  useEffect(() => {
    const unsubscribeViewport = viewportKeyStore.subscribe((newViewport) => {
      setCurrentViewport(newViewport.value);
    });

    return () => {
      unsubscribeViewport();
    };
  }, []);

  let nodesToRender = (
    <>
      <RenderChildren children={children} nodeProps={props} />
      {!isPreview && [`text`, `insert`].includes(toolModeVal) && (
        <GhostInsertBlock
          nodeId={props.nodeId}
          ctx={props.ctx}
          isEmpty={isEmpty}
          lastChildId={lastChildId}
        />
      )}
    </>
  );

  if ("parentClasses" in node && (node.parentClasses as ParentClassesPayload)?.length > 0) {
    const parentClassesLength = (node.parentClasses as ParentClassesPayload).length;
    for (let i = parentClassesLength; i > 0; --i) {
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
          className={getCtx(props).getNodeClasses(id, currentViewport, i - 1)}
          style={i === parentClassesLength ? { position: "relative", zIndex: 10 } : undefined}
        >
          {nodesToRender}
        </div>
      );
    }
  } else {
    nodesToRender = <div style={{ position: "relative", zIndex: 10 }}>{nodesToRender}</div>;
  }

  return <>{nodesToRender}</>;
};
