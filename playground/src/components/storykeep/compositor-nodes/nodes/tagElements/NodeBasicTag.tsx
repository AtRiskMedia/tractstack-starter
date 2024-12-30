import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses, notifications, setClickedNodeId } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { type JSX, useEffect, useState } from "react";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = ({ tagName, nodeId }: NodeTagProps) => {
  const [children, setChildren] = useState<string[]>(getChildNodeIDs(nodeId));

  const Tag = tagName;
  useEffect(() => {
    const unsubscribe = notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
      setChildren(getChildNodeIDs(nodeId));
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
      {children.map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </Tag>
  );
};
