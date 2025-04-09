import BgVisualBreak from "@/components/common/panes/BgVisualBreak.tsx";
import BgImage from "@/components/common/panes/BgImage.tsx";
import { type NodeProps } from "@/types";
import { getCtx } from "@/store/nodes";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { isBgImageNode, isArtpackImageNode } from "@/utils/nodes/type-guards";
import type { BgImageNode, VisualBreakNode } from "@/types";

export const BgPaneWrapper = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId);
  if (!node) return null;

  const viewport = viewportKeyStore.get().value;

  const handleClick = (e: React.MouseEvent) => {
    getCtx(props).setClickedNodeId(props.nodeId, true);
    e.stopPropagation();
  };

  if (isBgImageNode(node) || isArtpackImageNode(node)) {
    return <BgImage payload={node as BgImageNode} viewportKey={viewport} />;
  } else {
    return (
      <div onClick={handleClick}>
        <BgVisualBreak payload={node as VisualBreakNode} viewportKey={viewport} />
      </div>
    );
  }
};
