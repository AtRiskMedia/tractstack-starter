import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes.ts";
import { useEffect, useState } from "react";

export const Root = (props: NodeProps) => {
  const [children, setChildren] = useState<string[]>(getCtx().getChildNodeIDs(props.nodeId));

  useEffect(() => {
    const unsubscribe = getCtx().notifications.subscribe(ROOT_NODE_NAME, () => {
      console.log("notification received data update for root node");
      setChildren([...getCtx().getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      {/*<span>*/}
      {/*  Root <b>{props.nodeId}</b>*/}
      {/*</span>*/}
      {children.map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </>
  );
};
