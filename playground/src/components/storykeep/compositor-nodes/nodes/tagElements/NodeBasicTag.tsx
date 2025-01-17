import { getCtx } from "@/store/nodes.ts";
import { toolModeValStore, viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { type JSX, useEffect, useRef, useState } from "react";
import { canEditText, parseMarkdownToNodes } from "@/utils/common/nodesHelper.ts";
import type { FlatNode } from "@/types.ts";

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const wasFocused = useRef<boolean>(false);
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));
  const originalTextRef = useRef<string>("");

  const Tag = props.tagName;
  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
      setChildren([...getCtx(props).getChildNodeIDs(nodeId)]);
    });
    getCtx(props).clickedNodeId.subscribe((val) => {
      if (wasFocused.current && val !== nodeId) {
        originalTextRef.current = "";
      }
    });
    return unsubscribe;
  }, []);

  // showGuids means each node has a dotted outline and must render as div (can't be p, e.g.)
  if (showGuids.get())
    return (
      <div
        className={getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)}
        onClick={(e) => {
          getCtx(props).setClickedNodeId(nodeId);
          e.stopPropagation();
        }}
      >
        <RenderChildren children={children} nodeProps={props} />
      </div>
    );

  return (
    <Tag
      className={getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)}
      contentEditable={toolModeValStore.get().value === "default"}
      suppressContentEditableWarning
      onBlur={(e) => {
        function reset() {
          wasFocused.current = false;
        }

        if (!canEditText(props) || e.target.tagName === "BUTTON" || !wasFocused.current) {
          reset();
          return;
        }

        const node = getCtx(props).allNodes.get().get(nodeId);

        reset();
        const newText = e.currentTarget.innerHTML;
        console.log("on blur text: " + newText);

        if (newText === originalTextRef.current) {
          // no changes, redraw self to remove the markdown
          getCtx(props).notifyNode(node?.parentId || "");
          return;
        }

        const textToNodes = parseMarkdownToNodes(newText, nodeId);
        console.log("on blur nodes: ", textToNodes);
        if (textToNodes?.length > 0) {
          // should get styles from text not "a"
          const originalLinksStyles = getCtx(props)
            .getNodesRecursively(node)
            .filter((childNode) => "tagName" in childNode && childNode?.tagName === "a")
            .map((childNode) => childNode as FlatNode)
            .reverse();
          // keep original element on, we care about chldren only
          getCtx(props).deleteChildren(nodeId);

          // convert markdown to children nodes
          textToNodes.forEach((node: FlatNode) => {
            const foundNode = originalLinksStyles.find((x) => x.href === node.href);
            if (foundNode) {
              node.buttonPayload = foundNode.buttonPayload;
            }
          });
          getCtx(props).addNodes(textToNodes);
          getCtx(props).nodeToNotify(nodeId, "Pane");
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        getCtx(props).setClickedNodeId(nodeId);
        e.stopPropagation();
      }}
      onFocus={(e) => {
        if (!canEditText(props) || e.target.tagName === "BUTTON") {
          return;
        }

        wasFocused.current = true;
        // Ensure the element is content-editable and fetch its innerHTML
        originalTextRef.current = e.currentTarget.innerHTML;
        console.log("Original text saved:", originalTextRef.current);
      }}
    >
      <RenderChildren children={children} nodeProps={props} />
    </Tag>
  );
};
