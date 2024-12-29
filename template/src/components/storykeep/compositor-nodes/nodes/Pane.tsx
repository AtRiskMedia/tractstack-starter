import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import {
  getNodeCodeHookPayload,
  getNodeSlug,
  getChildNodeIDs,
  getNodeClasses,
  getNodeStyles,
  getPaneBeliefs, addTemplateNode, notifications,
} from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { type CSSProperties, useEffect, useState } from "react";
import Filter from "@/components/frontend/state/Filter.tsx";
import { TemplateH2Node } from "@/utils/TemplateNodes.ts";

export const Pane = (props: NodeProps) => {
  const wrapperClasses = `grid ${getNodeClasses(props.nodeId, viewportStore.get().value)}`;
  const contentClasses = "relative w-full h-auto justify-self-start";
  const contentStyles: CSSProperties = {
    ...getNodeStyles<CSSProperties>(props.nodeId, viewportStore.get().value),
    gridArea: "1/1/1/1",
  };
  const codeHookPayload = getNodeCodeHookPayload(props.nodeId);
  const [children, setChildren] = useState<string[]>([...getChildNodeIDs(props.nodeId)]);

  const getPaneId = (): string => `pane-${props.nodeId}`;

  useEffect(() => {
    const unsubscribe = notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for page node: " + props.nodeId);
      setChildren([...getChildNodeIDs(props.nodeId)]);
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

  const beliefs = getPaneBeliefs(props.nodeId);

  // todo naz - make pane more modular
  return (
    <div id={getPaneId()} className="pane">
      <div id={getNodeSlug(props.nodeId)} className={wrapperClasses}>
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
      <div className="flex">
        <button className="bg-cyan-500 rounded-md p-2" onClick={() => {
          const children = getChildNodeIDs(props.nodeId);
          addTemplateNode(props.nodeId, TemplateH2Node, children[children.length - 1], "after");
        }}>
          Add Pane
        </button>
      </div>
    </div>
  );
};
