import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { useEffect, useState } from "react";

export const StoryFragment = (props: NodeProps) => {
  const [children, setChildren] = useState<string[]>([...getCtx().getChildNodeIDs(props.nodeId)]);

  useEffect(() => {
    const unsubscribe = getCtx().notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for storyfragment node: " + props.nodeId);
      setChildren([...getCtx().getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className={getCtx().getNodeClasses(props.nodeId, viewportStore.get().value)}
      style={getCtx().getNodeCSSPropertiesStyles(props.nodeId, viewportStore.get().value)}
    >
      {children.map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </div>
  );
};
