import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getNodeSlug, getChildNodeIDs, getNodeClasses, getNodeStyles } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import type { CSSProperties } from "react";

export const Pane = (props: NodeProps) => {
  return (
    <div
      id={getNodeSlug(props.nodeId)}
      className={getNodeClasses(props.nodeId, viewportStore.get().value)}
      style={getNodeStyles<CSSProperties>(props.nodeId, viewportStore.get().value)}
    >
      {/*<span>*/}
      {/*  Pane <b>{props.id}</b>*/}
      {/*</span>*/}
      {getChildNodeIDs(props.nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </div>
  );
};
