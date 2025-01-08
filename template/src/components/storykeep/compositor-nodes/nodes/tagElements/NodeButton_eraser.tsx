import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node";
import { getCtx } from "@/store/nodes";
import { viewportStore } from "@/store/storykeep";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren";

export const NodeButtonEraser = (props: NodeProps) => {
  return (
    <button
      className={`
        ${getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}
        relative
        eraser-child
        before:absolute
        before:inset-0
        before:outline
        before:outline-4
        before:outline-dashed
        before:outline-red-700
        before:pointer-events-none
        before:opacity-0
        hover:before:opacity-100
        before:bg-red-600/50
        hover:before:bg-red-600/50
        transition-all
      `}
      title="Delete Link"
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
    >
      <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)} nodeProps={props} />
    </button>
  );
};
