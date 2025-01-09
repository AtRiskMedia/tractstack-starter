import { getCtx } from "@/store/nodes.ts";
import { toolModeValStore, viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { type JSX, useEffect, useState } from "react";
import type { FlatNode } from "@/types.ts";
import { canEditText } from "@/utils/common/nodesHelper.ts";

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));

  const Tag = props.tagName;
  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
      setChildren(getCtx(props).getChildNodeIDs(nodeId));
    });
    return unsubscribe;
  }, []);

  // showGuids means each node has a dotted outline and must render as div (can't be p, e.g.)
  if (showGuids.get())
    return (
      <div
        className={getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)}
        onClick={(e) => {
          getCtx(props).setClickedNodeId(nodeId);
          e.stopPropagation();
        }}
      >
        <RenderChildren children={children} nodeProps={props} />
      </div>
    );

  return (
    <Tag
      className={getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)}
      contentEditable={toolModeValStore.get().value === "default" && canEditText(props)}
      suppressContentEditableWarning
      onBlur={(e) => {
        if (!canEditText(props)) return;
        const newText = e.currentTarget.textContent?.trimEnd();

        getCtx(props)
          .getChildNodeIDs(nodeId)
          .forEach((childId) => {
            const childNode = getCtx(props).allNodes.get().get(childId) as FlatNode;
            if (childNode && childNode.tagName === "text") {
              if (childNode.copy?.trimEnd() == newText) {
                return;
              }
              getCtx(props).modifyNodes([
                { ...childNode, copy: e.currentTarget.textContent } as FlatNode,
              ]);
              console.log(`updating node [${childId}] copy : ${e.currentTarget.textContent}`);
            }
          });
      }}
      onClick={(e) => {
        getCtx(props).setClickedNodeId(nodeId);
        e.stopPropagation();
      }}
    >
      <RenderChildren children={children} nodeProps={props} />
    </Tag>
  );
};
