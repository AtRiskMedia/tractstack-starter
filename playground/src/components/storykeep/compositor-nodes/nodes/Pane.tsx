import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
//import CodeHookWrapper from "../../compositor/CodeHookWrapper";
import {
  getNodeCodeHookPayload,
  getNodeSlug,
  getChildNodeIDs,
  getNodeClasses,
  getNodeStyles,
  getPaneBeliefs,
} from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import type { CSSProperties } from "react";
import Filter from "@/components/frontend/state/Filter.tsx";

export const Pane = (props: NodeProps) => {
  const wrapperClasses = `grid ${getNodeClasses(props.nodeId, viewportStore.get().value)}`;
  const contentClasses = "relative w-full h-auto justify-self-start";
  const contentStyles: CSSProperties = {
    ...getNodeStyles<CSSProperties>(props.nodeId, viewportStore.get().value),
    gridArea: "1/1/1/1",
  };
  const codeHookPayload = getNodeCodeHookPayload(props.nodeId);

  const getPaneId = (): string => `pane-${props.nodeId}`;

  if (codeHookPayload) {
    return (
      <div id={getPaneId()}>
        <em>Code Hook:</em>
        {JSON.stringify(codeHookPayload, null, 2)}
      </div>
    );
  }

  const beliefs = getPaneBeliefs(props.nodeId);

  // todo naz - make pane more modular
  return (
    <div id={getPaneId()}>
      <div id={getNodeSlug(props.nodeId)} className={wrapperClasses}>
        {beliefs && (
          <Filter
            id={props.nodeId}
            heldBeliefsFilter={beliefs.heldBeliefs}
            withheldBeliefsFilter={beliefs.withheldBeliefs}
          />
        )}
        <div className={contentClasses} style={contentStyles}>
          {getChildNodeIDs(props.nodeId).map((id: string) => (
            <Node nodeId={id} key={id} />
          ))}
        </div>
      </div>
    </div>
  );
};
