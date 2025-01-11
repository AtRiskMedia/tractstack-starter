import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { toolModeValStore, viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { useRef } from "react";

export const NodeButton = (props: NodeProps) => {
  const spanRef = useRef<HTMLSpanElement | null>(null);

  return (
    <button
      className={getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
        spanRef.current?.focus();
      }}
    >
      <span ref={spanRef}
        contentEditable={toolModeValStore.get().value === "default"}
      >
        <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)} nodeProps={props} />
      </span>
    </button>
  );
};
