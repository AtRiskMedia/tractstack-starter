import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { toolModeValStore, viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { useRef } from "react";

export const NodeA = (props: NodeProps) => {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const originalTextRef = useRef<string>("");

  return (
    <button
      className={getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        textRef.current?.focus();
        e.stopPropagation();
      }}
      onBlur={(e) => e.stopPropagation()}
    >
      <span
        ref={textRef}
        contentEditable={toolModeValStore.get().value === "default"}
        suppressContentEditableWarning
        tabIndex={0}
        style={{ display: "block", outline: "none" }}
        onFocus={(e) => {
          console.log("A got focus");
          e.stopPropagation();

          originalTextRef.current = e.target.textContent as string;
        }}
        onBlur={(e) => {
          console.log("A got blur");
          e.stopPropagation();

          const newText = e.currentTarget.textContent?.trimEnd() || "";
          if (newText === originalTextRef.current) {
            return;
          }

          // keep original element on, we care about chldren only
          getCtx(props).deleteChildren(props.nodeId);

          // convert markdown to children nodes
          //const nodesFromMarkdown = markdownToNodes(newText, props.nodeId);
          //getCtx(props).addNodes(nodesFromMarkdown);
        }}
        onMouseDown={(e) => {
          const range = document.createRange();
          range.setStart(e.currentTarget, 0);
          range.collapse(false); // Places caret at the end
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          e.currentTarget.focus();
          e.stopPropagation();
        }}
      >
        <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)} nodeProps={props} />
      </span>
    </button>
  );
};
