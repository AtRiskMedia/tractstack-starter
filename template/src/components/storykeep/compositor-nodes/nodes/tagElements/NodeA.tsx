import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { toolModeValStore, viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { useRef } from "react";
import { parseMarkdownToNodes } from "@/utils/common/nodesHelper.ts";
import type { FlatNode } from "@/types.ts";

export const NodeA = (props: NodeProps) => {
  const originalTextRef = useRef<string>("");
  const nodeId = props.nodeId;

  const node = getCtx(props).allNodes.get().get(nodeId);
  const isFirstChild = getCtx(props).getChildNodeIDs(node?.parentId ?? "")[0] === nodeId;
  const isLastChild = getCtx(props).getChildNodeIDs(node?.parentId ?? "")?.last() === nodeId;

  return (
    <>
      {isFirstChild && '\u00A0'}
      <a
        className={getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}
        onClick={(e) => {
          getCtx(props).setClickedNodeId(props.nodeId);
          e.stopPropagation();
        }}
        contentEditable={toolModeValStore.get().value === "default"}
        suppressContentEditableWarning
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onFocus={(e) => {
          console.log("A got focus");
          e.stopPropagation();

          // Ensure the element is content-editable and fetch its innerHTML
          originalTextRef.current = e.currentTarget.innerHTML;
          console.log("Original text saved:", originalTextRef.current);
        }}
        onBlur={(e) => {
          console.log("A got blur");
          e.stopPropagation();


          const newText = e.currentTarget.innerHTML;
          if (newText === originalTextRef.current) {
            return;
          }

          const textToNodes = parseMarkdownToNodes(newText, nodeId);
          console.log("on blur nodes: ", textToNodes);
          if (textToNodes?.length > 0) {
            // should get styles from text not "a"
            const originalLinksStyles = getCtx(props)
              .getNodesRecursively(node)
              .filter((childNode) => "tagName" in childNode && childNode?.tagName === "a")
              .map((childNode) => (childNode as FlatNode).buttonPayload)
              .reverse();
            // keep original element on, we care about chldren only
            getCtx(props).deleteChildren(nodeId);

            // convert markdown to children nodes
            let stylesIdx = 0;
            textToNodes.forEach((node: FlatNode) => {
              if (node.tagName === "a") {
                node.buttonPayload = originalLinksStyles[stylesIdx++];
              }
            });
            getCtx(props).addNodes(textToNodes);
            getCtx(props).nodeToNotify(nodeId, "Pane");
          }
        }}
      >
        <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)} nodeProps={props} />
      </a>
      {isLastChild && '\u00A0'}
    </>
  );
};
