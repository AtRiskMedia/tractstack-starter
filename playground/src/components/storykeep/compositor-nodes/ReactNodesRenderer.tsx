import { buildNodesTreeFromFragmentNodes, rootNodeId } from "@/store/nodes.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { useEffect, useState } from "react";
import type { StoryKeepNodes } from "@/types.ts";

export const ReactNodesRenderer = ({ nodes }: { nodes: StoryKeepNodes | null }) => {
  const [rootId, setRootId] = useState<string>("");

  useEffect(() => {
    buildNodesTreeFromFragmentNodes(nodes);
    setRootId(rootNodeId.get());
  }, []);

  return <>{rootId.length > 0 && <Node nodeId={rootId} />}</>;
};
