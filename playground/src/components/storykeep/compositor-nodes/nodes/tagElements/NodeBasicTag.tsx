import { getCtx } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
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

  if (showGuids.get())
    return (
      <div
        className={getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)}
        onClick={(e) => {
          getCtx(props).setClickedNodeId(nodeId);
          e.stopPropagation();
        }}
      >
        <RenderChildren children={children} nodeProps={props} />
      </div>
    );

  return (
    <Tag
      className={getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)}
      onClick={(e) => {
        getCtx(props).setClickedNodeId(nodeId);
        e.stopPropagation();
      }}
    >
      <RenderChildren children={children} nodeProps={props} />
    </Tag>
  );
};
