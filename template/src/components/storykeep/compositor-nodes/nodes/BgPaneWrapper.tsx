import BgPane from "../../compositor/BgPaneNew";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node";
import { allNodes } from "@/store/nodes";
import { viewportStore } from "@/store/storykeep";
import type { VisualBreakNode } from "@/types";

export const BgPaneWrapper = (props: NodeProps) => {
  const node = allNodes.get().get(props.nodeId) as VisualBreakNode;
  const viewport = viewportStore.get().value;

  return <BgPane payload={node} viewportKey={viewport} />;
};
