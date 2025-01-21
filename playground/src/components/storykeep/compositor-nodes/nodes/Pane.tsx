import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore, showAnalytics } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import PaneAnalyticsPanel from "@/components/storykeep/controls/pane/PaneAnalyticsPanel.tsx";
import { type CSSProperties, useEffect, useState } from "react";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";

export const Pane = (props: NodeProps) => {
  const $showAnalytics = showAnalytics.get();
  const wrapperClasses = `grid ${getCtx(props).getNodeClasses(props.nodeId, viewportKeyStore.get().value)}`;
  const contentClasses = "relative w-full h-auto justify-self-start";
  const contentStyles: CSSProperties = {
    ...getCtx(props).getNodeCSSPropertiesStyles(props.nodeId, viewportKeyStore.get().value),
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
            // treat as dbl-click to force open panel
            getCtx(props).setClickedNodeId(props.nodeId, true);
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
          {$showAnalytics ? <PaneAnalyticsPanel nodeId={props.nodeId} /> : null}
        </div>
      </div>
    </div>
  );
};
