import type { NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { useRef } from "react";
import { getCtx } from "@/store/nodes.ts";
import { parseMarkdownToNodes } from "@/utils/common/nodesHelper.ts";
import type { FlatNode } from "@/types.ts";
import { toolModeValStore, viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";

export const NodeAnchorComponent = (props: NodeProps, tagName: string) => {
  const originalTextRef = useRef<string>("");
  const nodeId = props.nodeId;

  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(nodeId);
  const childNodeIDs = ctx.getChildNodeIDs(node?.parentId ?? "");
  const isFirstChild = childNodeIDs[0] === nodeId;
  const isLastChild = childNodeIDs[childNodeIDs.length - 1] === nodeId;

  const handleBlur = (e: React.FocusEvent<HTMLAnchorElement>) => {
    console.log(`${tagName} got blur`);
    e.stopPropagation();

    const newText = e.currentTarget.innerHTML;
    if (newText === originalTextRef.current) {
      return;
    }

    const textToNodes = parseMarkdownToNodes(newText, nodeId);
    console.log("on blur nodes: ", textToNodes);

    if (textToNodes?.length > 0) {
      const originalLinksStyles = ctx
        .getNodesRecursively(node)
        .filter((childNode) => "tagName" in childNode && childNode?.tagName === "a")
        .map((childNode) => childNode as FlatNode)
        .reverse();

      ctx.deleteChildren(nodeId);

      textToNodes.forEach((newNode: FlatNode) => {
        const foundNode = originalLinksStyles.find((x) => x.href === newNode.href);
        if (foundNode) {
          newNode.buttonPayload = foundNode.buttonPayload;
        }
      });

      ctx.addNodes(textToNodes);
      ctx.nodeToNotify(nodeId, "Pane");
    }
  };

  return (
    <>
      {isFirstChild && "\u00A0"}
      <a
        className={ctx.getNodeClasses(nodeId, viewportStore.get().value)}
        href={(node as FlatNode).href}
        contentEditable={toolModeValStore.get().value === "default"}
        suppressContentEditableWarning
        onClick={(e) => {
          ctx.setClickedNodeId(nodeId);
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        onDoubleClick={(e) => {
          ctx.setClickedNodeId(nodeId, true);
          e.stopPropagation();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onFocus={(e) => {
          e.stopPropagation();
          originalTextRef.current = e.currentTarget.innerHTML;
          console.log("Original text saved:", originalTextRef.current);
        }}
        onBlur={handleBlur}
      >
        <RenderChildren children={ctx.getChildNodeIDs(nodeId)} nodeProps={props} />
      </a>
      {isLastChild && "\u00A0"}
    </>
  );
};
