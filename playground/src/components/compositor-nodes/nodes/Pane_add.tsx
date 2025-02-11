import { viewportKeyStore } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import AddPanePanel from "@/components/storykeep/controls/pane/AddPanePanel.tsx";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { CodeHookContainer } from "./Pane";
import { type CSSProperties, useEffect, useState } from "react";
import { type NodeProps } from "@/components/compositor-nodes/Node.tsx";

export const PaneAdd = (props: NodeProps) => {
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

  return (
    <>
      {props?.first && <AddPanePanel nodeId={props.nodeId} first={true} ctx={getCtx(props)} />}
      <div id={getPaneId()} className="pane">
        <div id={getCtx(props).getNodeSlug(props.nodeId)} className={wrapperClasses}>
          <div
            className={contentClasses}
            style={contentStyles}
            onClick={(e) => {
              getCtx(props).setClickedNodeId(props.nodeId);
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              getCtx(props).setClickedNodeId(props.nodeId, true);
              e.stopPropagation();
            }}
          >
            {codeHookPayload ? (
              <CodeHookContainer payload={codeHookPayload} />
            ) : (
              <RenderChildren children={children} nodeProps={props} />
            )}
          </div>
        </div>
      </div>
      <AddPanePanel nodeId={props.nodeId} ctx={getCtx(props)} />
    </>
  );
};
