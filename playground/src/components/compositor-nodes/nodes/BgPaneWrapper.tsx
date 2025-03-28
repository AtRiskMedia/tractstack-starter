import BgPane from "@/components/common/panes/BgPane.tsx";
import { type NodeProps } from "@/types";
import { getCtx } from "@/store/nodes";
import { viewportKeyStore } from "@/store/storykeep.ts";
import type { VisualBreakNode } from "@/types";

export const BgPaneWrapper = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as VisualBreakNode;
  const viewport = viewportKeyStore.get().value;
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
