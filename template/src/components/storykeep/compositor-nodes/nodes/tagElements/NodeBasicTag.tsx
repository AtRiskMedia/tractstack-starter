import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses, notifications, setClickedNodeId } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { type JSX, useEffect } from "react";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = ({ tagName, nodeId }: NodeTagProps) => {
  const Tag = tagName;
  useEffect(() => {
    const unsubscribe = notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
    });
    return unsubscribe;
  }, []);

  return (
    <Tag
      className={getNodeClasses(nodeId, viewportStore.get().value)}
      onClick={() => {
        setClickedNodeId(nodeId);
      }}
    >
      {getChildNodeIDs(nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </Tag>
  );
};
