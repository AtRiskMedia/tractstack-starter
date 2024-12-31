import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { type JSX, useEffect, useState } from "react";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));

  const Tag = props.tagName;
  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
      setChildren(getCtx(props).getChildNodeIDs(nodeId));
    });
    return unsubscribe;
  }, []);

  return (
    <Tag
      className={getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)}
      onClick={() => {
        getCtx(props).setClickedNodeId(nodeId);
      }}
    >
      {children.map((id: string) => (
        <Node nodeId={id} key={id} ctx={props.ctx} />
      ))}
    </Tag>
  );
};
