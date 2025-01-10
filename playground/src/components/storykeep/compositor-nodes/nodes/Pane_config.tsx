import { viewportStore } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import ConfigPanePanel from "@/components/storykeep/controls/pane/ConfigPanePanel.tsx";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { type CSSProperties, useEffect, useState } from "react";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";

export const PaneConfig = (props: NodeProps) => {
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

  return (
    <>
      <ConfigPanePanel nodeId={props.nodeId} />
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
          </div>
        </div>
      </div>
    </>
  );
};
