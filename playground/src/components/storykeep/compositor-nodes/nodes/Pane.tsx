import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { type CSSProperties, useEffect, useState } from "react";
import Filter from "@/components/frontend/state/Filter.tsx";

export const Pane = (props: NodeProps) => {
  const wrapperClasses = `grid ${getCtx().getNodeClasses(props.nodeId, viewportStore.get().value)}`;
  const contentClasses = "relative w-full h-auto justify-self-start";
  const contentStyles: CSSProperties = {
    ...getCtx().getNodeCSSPropertiesStyles(props.nodeId, viewportStore.get().value),
    gridArea: "1/1/1/1",
  };
  const codeHookPayload = getCtx().getNodeCodeHookPayload(props.nodeId);
  const [children, setChildren] = useState<string[]>([...getCtx().getChildNodeIDs(props.nodeId)]);

  const getPaneId = (): string => `pane-${props.nodeId}`;

  useEffect(() => {
    const unsubscribe = getCtx().notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for page node: " + props.nodeId);
      setChildren([...getCtx().getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  if (codeHookPayload) {
    return (
      <div id={getPaneId()}>
        <em>Code Hook:</em>
        {JSON.stringify(codeHookPayload, null, 2)}
      </div>
    );
  }

  const beliefs = getCtx().getPaneBeliefs(props.nodeId);

  // todo naz - make pane more modular
  return (
    <div id={getPaneId()} className="pane">
      <div id={getCtx().getNodeSlug(props.nodeId)} className={wrapperClasses}>
        {beliefs && (
          <Filter
            id={props.nodeId}
            heldBeliefsFilter={beliefs.heldBeliefs}
            withheldBeliefsFilter={beliefs.withheldBeliefs}
          />
        )}
        <div className={contentClasses} style={contentStyles}>
          {children.map((id: string) => (
            <Node nodeId={id} key={id} />
          ))}
        </div>
      </div>
      <button
        className="bg-red-500 rounded-md p-2"
        onClick={() => {
          getCtx().deleteNode(props.nodeId);
        }}
      >
        Delete This Pane
      </button>
    </div>
  );
};
