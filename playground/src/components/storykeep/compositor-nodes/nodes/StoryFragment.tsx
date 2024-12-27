import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses, getNodeStyles } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import type { CSSProperties } from "react";

export const StoryFragment = (props: NodeProps) => {
  return (
    <div
      className={getNodeClasses(props.nodeId, viewportStore.get().value)}
      style={getNodeStyles<CSSProperties>(props.nodeId, viewportStore.get().value)}
    >
      {/*<span>*/}
      {/*  Story Fragment <b>{props.id}</b>*/}
      {/*</span>*/}
      {getChildNodeIDs(props.nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </div>
  );
};
