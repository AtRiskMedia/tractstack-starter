import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getNodeSlug, getChildNodeIDs, getNodeClasses, getNodeStyles } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import type { CSSProperties } from "react";

export const Pane = (props: NodeProps) => {
  const wrapperClasses = `grid ${getNodeClasses(props.nodeId, viewportStore.get().value)}`;
  const contentClasses = "relative w-full h-auto justify-self-start";
  const contentStyles: CSSProperties = {
    ...getNodeStyles<CSSProperties>(props.nodeId, viewportStore.get().value),
    gridArea: "1/1/1/1",
  };

  return (
    <div id={`pane-${props.nodeId}`}>
      <div id={getNodeSlug(props.nodeId)} className={wrapperClasses}>
        <div className={contentClasses} style={contentStyles}>
          {getChildNodeIDs(props.nodeId).map((id: string) => (
            <Node nodeId={id} key={id} />
          ))}
        </div>
      </div>
    </div>
  );
};
