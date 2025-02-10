import type { NodeProps } from "@/components/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
//import { useRef } from "react";
//import { parseMarkdownToNodes } from "@/utils/common/nodesHelper.ts";
//import { PatchOp } from "@/store/nodesHistory.ts";

export const NodeAnchorComponent = (props: NodeProps, tagName: string) => {
  const nodeId = props.nodeId;
  //const originalTextRef = useRef<string>("");
  //const wasFocused = useRef<boolean>(false);

  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(nodeId);
  console.log(node);
  const childNodeIDs = ctx.getChildNodeIDs(node?.parentId ?? "");
  const isFirstChild = childNodeIDs[0] === nodeId;
  const isLastChild = childNodeIDs[childNodeIDs.length - 1] === nodeId;

  //const handleBlur = (e: React.FocusEvent<HTMLAnchorElement>) => {
  //  function reset() {
  //    wasFocused.current = false;
  //  }

  //  console.log(`${tagName} got blur`);
  //  e.stopPropagation();

  //  const newText = e.currentTarget.innerHTML;
  //  if (newText === originalTextRef.current || !wasFocused.current) {
  //    reset();
  //    return;
  //  }

  //  const textToNodes = parseMarkdownToNodes(newText, nodeId);
  //  console.log("on blur nodes: ", textToNodes);

  //  reset();
  //  if (textToNodes?.length > 0) {
  //    const originalLinksStyles = ctx
  //      .getNodesRecursively(node)
  //      .filter((childNode) => "tagName" in childNode && childNode?.tagName === "a")
  //      .map((childNode) => childNode as FlatNode)
  //      .reverse();

  //    const deletedNodes = ctx.deleteChildren(nodeId);

  //    textToNodes.forEach((newNode: FlatNode) => {
  //      const foundNode = originalLinksStyles.find((x) => x.href === newNode.href);
  //      if (foundNode) {
  //        newNode.buttonPayload = foundNode.buttonPayload;
  //      }
  //    });

  //    ctx.addNodes(textToNodes);
  //    ctx.nodeToNotify(nodeId, "Pane");

  //    getCtx(props).history.addPatch({
  //      op: PatchOp.REMOVE,
  //      undo: (ctx) => {
  //        ctx.deleteChildren(nodeId);
  //        ctx.addNodes(deletedNodes);
  //        ctx.nodeToNotify(nodeId, "Pane");
  //      },
  //      redo: (ctx) => {
  //        ctx.deleteChildren(nodeId);
  //        ctx.addNodes(textToNodes);
  //        ctx.nodeToNotify(nodeId, "Pane");
  //      },
  //    });
  //  }
  //};

  return (
    <>
      {isFirstChild && "\u00A0"}
      <a
        className={ctx.getNodeClasses(nodeId, viewportKeyStore.get().value)}
        href={(node as FlatNode).href}
        //contentEditable={getCtx(props).toolModeValStore.get().value === "default"}
        //suppressContentEditableWarning
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
        //onFocus={(e) => {
        //  e.stopPropagation();
        //  originalTextRef.current = e.currentTarget.innerHTML;
        //  console.log("Original text saved:", originalTextRef.current);
        //}}
        //onBlur={handleBlur}
      >
        {"\u00A0"}
        <RenderChildren children={ctx.getChildNodeIDs(nodeId)} nodeProps={props} />
      </a>
      {isLastChild && "\u00A0"}
    </>
  );
};
