import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { useEffect, useState } from "react";
import { timestampNodeId } from "@/utils/common/helpers.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";

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
      className={getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}
      style={getCtx(props).getNodeCSSPropertiesStyles(props.nodeId, viewportStore.get().value)}
    >
      <RenderChildren children={children} nodeProps={props}/>
    </div>
  );
};
