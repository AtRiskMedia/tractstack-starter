import { getCtx } from "@/store/nodes.ts";
import { viewportStore, showAnalytics } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { type CSSProperties, useEffect, useState } from "react";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";

export const Pane = (props: NodeProps) => {
  const $showAnalytics = showAnalytics.get();
  const wrapperClasses = `grid ${getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}`;
  const contentClasses = "relative w-full h-auto justify-self-start";
  const contentStyles: CSSProperties = {
    ...getCtx(props).getNodeCSSPropertiesStyles(props.nodeId, viewportStore.get().value),
    gridArea: "1/1/1/1",
  };
  const codeHookPayload = getCtx(props).getNodeCodeHookPayload(props.nodeId);
  const [children, setChildren] = useState<string[]>([
    ...getCtx(props).getChildNodeIDs(props.nodeId),
  ]);

  const getPaneId = (): string => `pane-${props.nodeId}`;

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for page node: " + props.nodeId);
      setChildren([...getCtx(props).getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  // todo naz - make pane more modular
  return (
    <div id={getPaneId()} className="pane">
      <div id={getCtx(props).getNodeSlug(props.nodeId)} className={wrapperClasses}>
        <div
          className={contentClasses}
          style={contentStyles}
          onClick={(e) => {
            getCtx(props).setClickedNodeId(props.nodeId);
            e.stopPropagation();
          }}
        >
          {codeHookPayload ? (
            <>
              <em>Code Hook:</em>
              {JSON.stringify(codeHookPayload, null, 2)}
            </>
          ) : (
            <RenderChildren children={children} nodeProps={props} />
          )}
          {$showAnalytics ? (
            <div className="bg-cyan-500">pane analytics conditionally rendered here</div>
          ) : null}
        </div>
      </div>
      <button
        className="bg-red-500 rounded-md p-2"
        onClick={() => {
          getCtx(props).deleteNode(props.nodeId);
        }}
      >
        Delete This Pane
      </button>
    </div>
  );
};
