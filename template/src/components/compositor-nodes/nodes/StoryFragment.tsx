import { useEffect, useState } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { type NodeProps } from "@/types";

export const StoryFragment = (props: NodeProps) => {
  const [children, setChildren] = useState<string[]>([
    ...getCtx(props).getChildNodeIDs(props.nodeId),
  ]);

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for storyfragment node: " + props.nodeId);
      setChildren([...getCtx(props).getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className={getCtx(props).getNodeClasses(props.nodeId, viewportKeyStore.get().value)}
      style={getCtx(props).getNodeCSSPropertiesStyles(props.nodeId, viewportKeyStore.get().value)}
    >
      <RenderChildren children={children} nodeProps={props} />
    </div>
  );
};
