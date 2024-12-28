import { buildNodesTreeFromFragmentNodes, rootNodeId } from "@/store/nodes.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { useEffect, useState } from "react";
import type { StoryKeepAllNodes } from "@/types.ts";

export type ReactNodesRendererProps = {
  nodes: StoryKeepAllNodes | null,
  slug: string,
}

export const ReactNodesRenderer = (props: ReactNodesRendererProps) => {
  const [rootId, setRootId] = useState<string>("");

  useEffect(() => {
    buildNodesTreeFromFragmentNodes(props.nodes);
    setRootId(rootNodeId.get());
  }, []);

  return <>{rootId.length > 0 && <Node nodeId={rootId} />}</>;
};
