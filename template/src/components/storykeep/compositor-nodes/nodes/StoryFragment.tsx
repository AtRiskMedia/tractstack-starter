import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses, getNodeStyles, notifications } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { type CSSProperties, useEffect, useState } from "react";

export const StoryFragment = (props: NodeProps) => {
  const [children, setChildren] = useState<string[]>([...getChildNodeIDs(props.nodeId)]);

  useEffect(() => {
    const unsubscribe = notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for storyfragment node: " + props.nodeId);
      setChildren([...getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className={getNodeClasses(props.nodeId, viewportStore.get().value)}
      style={getNodeStyles<CSSProperties>(props.nodeId, viewportStore.get().value)}
    >
      {children.map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </div>
  );
};
