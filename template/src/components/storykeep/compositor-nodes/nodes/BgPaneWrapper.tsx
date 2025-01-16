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
        // treat as dbl-click to force open panel
        getCtx(props).setClickedNodeId(props.nodeId, true);
        e.stopPropagation();
      }}
    >
      <BgPane payload={node} viewportKey={viewport} />
    </div>
  );
};
