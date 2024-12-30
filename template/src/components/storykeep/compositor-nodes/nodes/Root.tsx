import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import {
  getChildNodeIDs,
  notifications,
  ROOT_NODE_NAME,
} from "@/store/nodes.ts";
import { useEffect, useState } from "react";

export const Root = (props: NodeProps) => {
  const [children, setChildren] = useState<string[]>(getChildNodeIDs(props.nodeId));

  useEffect(() => {
    const unsubscribe = notifications.subscribe(ROOT_NODE_NAME, () => {
      console.log("notification received data update for root node");
      setChildren([...getChildNodeIDs(props.nodeId)]);
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
