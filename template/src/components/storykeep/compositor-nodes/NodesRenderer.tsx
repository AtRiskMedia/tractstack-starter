import { rootNodeId } from "@/store/nodes.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";

export const NodesRenderer = () => {
  const rootId = rootNodeId.get();
  return (
    <Node id={rootId}/>
  );
}