import { getCtx } from "@/store/nodes";
import { viewportKeyStore } from "@/store/storykeep";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import { type NodeProps } from "@/types"

export const NodeAEraser = (props: NodeProps) => {
  return (
    <button
      className={`
        ${getCtx(props).getNodeClasses(props.nodeId, viewportKeyStore.get().value)}
        relative
        eraser-child
        group
        before:absolute
        before:inset-0
        before:outline
        before:outline-4
        before:outline-dashed
        before:outline-red-700
        before:pointer-events-none
        before:opacity-50
        hover:before:opacity-100
        focus:before:opacity-100
        hover:before:bg-red-600/50
        focus:before:bg-red-600/50
        transition-all
      `}
      title="Delete Link"
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
    >
      <div className="absolute top-2 right-2 p-0.5 bg-red-700 rounded-full">
        <TrashIcon className="h-5 w-5 text-white" />
      </div>
      <RenderChildren children={getCtx(props).getChildNodeIDs(props.nodeId)} nodeProps={props} />
    </button>
  );
};
