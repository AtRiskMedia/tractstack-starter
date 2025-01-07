import { memo, type ReactElement } from "react";
import { getType, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";

export type RenderableNodes = NodeProps & { element: ReactElement };

export const NodeWithGuid = memo((props: RenderableNodes) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  return (
    <>
      <span
        className="relative text-sm block w-fit"
        style={{ color: "black", backgroundColor: "darkcyan" }}
      >
        {props.nodeId} - {getType(node)}
      </span>
      {props.element}
    </>
  );
});
