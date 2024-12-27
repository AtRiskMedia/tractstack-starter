import { rootNodeId } from "@/store/nodes.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";

export const ReactNodesRenderer = () => {
  const rootId = rootNodeId.get();
  return <Node nodeId={rootId} />;
};
