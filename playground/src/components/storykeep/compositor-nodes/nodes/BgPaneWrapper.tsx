import BgPane from "../../compositor/BgPaneNew";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node";
import { getCtx } from "@/store/nodes";
import { viewportStore } from "@/store/storykeep";
import type { VisualBreakNode } from "@/types";

export const BgPaneWrapper = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as VisualBreakNode;
  const viewport = viewportStore.get().value;

  return (
    <div
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
    >
      <BgPane payload={node} viewportKey={viewport} />
    </div>
  );
};
