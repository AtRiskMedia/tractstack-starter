import PuzzlePieceIcon from "@heroicons/react/24/outline/PuzzlePieceIcon";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { CodeHookContainer } from "./Pane";
import { type CSSProperties, useEffect, useState } from "react";
import { type NodeProps } from "@/types";

export const PaneLayout = (props: NodeProps) => {
  const wrapperClasses = `grid ${getCtx(props).getNodeClasses(props.nodeId, viewportKeyStore.get().value)}`;
  const contentClasses = "relative w-full h-auto justify-self-start";
  const contentStyles: CSSProperties = {
    ...getCtx(props).getNodeCSSPropertiesStyles(props.nodeId),
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
    <div id={getPaneId()} className="pane min-h-16">
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
          <button
            title="Apply New Layout"
            onClick={(e) => {
              getCtx(props).setClickedNodeId(props.nodeId);
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              getCtx(props).setClickedNodeId(props.nodeId, true);
              e.stopPropagation();
            }}
            className="z-10 absolute top-2 right-2 p-1.5 bg-cyan-700 rounded-full hover:bg-black"
          >
            <PuzzlePieceIcon className="h-10 w-10 text-white" />
          </button>
          {codeHookPayload ? (
            <CodeHookContainer payload={codeHookPayload} />
          ) : (
            <RenderChildren children={children} nodeProps={props} />
          )}
        </div>
      </div>
    </div>
  );
};
