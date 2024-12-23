import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses, getNodeStyles } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import type { CSSProperties } from "react";

export const Pane = (props: NodeProps) => {
  return (
    <div className={getNodeClasses(props.id, viewportStore.get().value)}
         style={getNodeStyles<CSSProperties>(props.id, viewportStore.get().value)}
    >
      {/*<span>*/}
      {/*  Pane <b>{props.id}</b>*/}
      {/*</span>*/}
      {getChildNodeIDs(props.id).map((id: string) => (
        <Node id={id} key={id} />
      ))}
    </div>
  );
}