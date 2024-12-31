import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { type JSX, useEffect, useState } from "react";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = ({ tagName, nodeId }: NodeTagProps) => {
  const [children, setChildren] = useState<string[]>(getCtx().getChildNodeIDs(nodeId));

  const Tag = tagName;
  useEffect(() => {
    const unsubscribe = getCtx().notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
      setChildren(getCtx().getChildNodeIDs(nodeId));
    });
    return unsubscribe;
  }, []);

  return (
    <Tag
      className={getCtx().getNodeClasses(nodeId, viewportStore.get().value)}
      onClick={() => {
        getCtx().setClickedNodeId(nodeId);
      }}
    >
      {children.map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </Tag>
  );
};
