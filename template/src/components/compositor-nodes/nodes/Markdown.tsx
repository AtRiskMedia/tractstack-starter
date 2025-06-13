import { useState, useEffect } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { GhostInsertBlock } from "./GhostInsertBlock";
import { type NodeProps } from "@/types";
import type {
  MarkdownPaneFragmentNode,
  ParentClassesPayload,
  BgImageNode,
  ArtpackImageNode,
} from "@/types.ts";

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

  // Check for positioned background image
  const allNodes = getCtx(props).allNodes.get();
  const parentPaneId = node.parentId;
  const bgNode = parentPaneId
    ? (() => {
        const childNodeIds = getCtx(props).getChildNodeIDs(parentPaneId);
        return childNodeIds
          .map((id) => allNodes.get(id))
          .find(
            (n) =>
              n?.nodeType === "BgPane" &&
              "type" in n &&
              (n.type === "background-image" || n.type === "artpack-image") &&
              "position" in n &&
              (n.position === "left" || n.position === "right")
          ) as (BgImageNode | ArtpackImageNode) | undefined;
      })()
    : undefined;

  // Helper function for size styles - NO MODIFIERS needed since React rerenders on viewport change
  function getSizeClasses(size: string, side: "image" | "content", viewport: string): string {
    // Mobile always gets full width (stacked layout)
    if (viewport === "mobile") {
      return "w-full";
    }

    // Desktop/tablet get fractional widths
    switch (size) {
      case "narrow":
        return side === "image" ? "w-1/3" : "w-2/3";
      case "wide":
        return side === "image" ? "w-2/3" : "w-1/3";
      default: // "equal"
        return "w-1/2";
    }
  }

  const useFlexLayout = bgNode && (bgNode.position === "left" || bgNode.position === "right");

  // Set flex direction based on currentViewport
  const flexDirection =
    currentViewport === "mobile"
      ? "flex-col"
      : bgNode?.position === "right"
        ? "flex-row-reverse"
        : "flex-row";

  let nodesToRender = (
    <>
      {useFlexLayout ? (
        <div
          className={`flex flex-nowrap justify-center items-center gap-6 md:gap-10 xl:gap-12 ${flexDirection}`}
        >
          {/* Image Side - NO MODIFIERS because React rerenders on viewport change */}
          <div
            className={`relative overflow-hidden ${getSizeClasses(bgNode.size || "equal", "image", currentViewport)}`}
          >
            <RenderChildren children={[bgNode.id]} nodeProps={props} />
          </div>

          {/* Content Side - NO MODIFIERS because React rerenders on viewport change */}
          <div className={getSizeClasses(bgNode.size || "equal", "content", currentViewport)}>
            <RenderChildren children={children} nodeProps={props} />
            {!isPreview && [`text`, `insert`].includes(toolModeVal) && (
              <GhostInsertBlock
                nodeId={props.nodeId}
                ctx={props.ctx}
                isEmpty={isEmpty}
                lastChildId={lastChildId}
              />
            )}
          </div>
        </div>
      ) : (
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
