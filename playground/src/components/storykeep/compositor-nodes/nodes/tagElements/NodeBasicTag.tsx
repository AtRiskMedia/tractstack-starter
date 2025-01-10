import { getCtx } from "@/store/nodes.ts";
import { toolModeValStore, viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { type JSX, useEffect, useRef, useState } from "react";
import type { FlatNode } from "@/types.ts";
import { canEditText } from "@/utils/common/nodesHelper.ts";
import { markdownToNodes, nodesToMarkdownText } from "@/utils/common/nodesMarkdownGenerator.ts";

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));
  const originalTextRef = useRef<string>("");

  const Tag = props.tagName;
  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
      setChildren([...getCtx(props).getChildNodeIDs(nodeId)]);
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
      contentEditable={toolModeValStore.get().value === "default" && canEditText(props)}
      suppressContentEditableWarning
      onBlur={(e) => {
        if (!canEditText(props) || e.target.tagName === "BUTTON") return;

        const newText = e.currentTarget.textContent?.trimEnd();
        if(newText === originalTextRef.current) {
          const node = getCtx(props).allNodes.get().get(nodeId);
          // no changes, redraw self to remove the markdown
          getCtx(props).notifyNode(node?.parentId || "");
          return;
        }

        if(newText) {
          // keep original element on, we care about chldren only
          getCtx(props).deleteChildren(nodeId);

          // convert markdown to children nodes
          const nodesFromMarkdown = markdownToNodes(newText, nodeId);
          getCtx(props).addNodes(nodesFromMarkdown);
        }
      }}
      onFocus={(e) => {
        if (!canEditText(props) || e.target.tagName === "BUTTON") return;

        if("isContentEditable" in e.target && e.target.isContentEditable) {
          const node = getCtx(props).allNodes.get().get(nodeId);
          const childNodes = getCtx(props).getNodesRecursively(node)
            .filter(x => "tagName" in x)
            .reverse() as FlatNode[];
          console.log(childNodes);

          const markdown = nodesToMarkdownText(childNodes);
          // save original markdown text in ref, no state so we don't trigger redraw
          if("textContent" in e.target) {
            e.target.textContent = markdown;
            originalTextRef.current = markdown;
          }
          console.log(markdown);
        }
      }}
      onClick={(e) => {
        getCtx(props).setClickedNodeId(nodeId);
        e.stopPropagation();
      }}
    >
      <RenderChildren children={children} nodeProps={props} />
    </Tag>
  );
};
