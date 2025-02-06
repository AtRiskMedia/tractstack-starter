import { memo, type ReactElement } from "react";
import { getType, type NodeProps } from "@/components/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";

export type RenderableNodes = NodeProps & { element: ReactElement };

export const NodeWithGuid = memo((props: RenderableNodes) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;

  return (
    <div className="relative">
      <div
        className="outline outline-2 outline-cyan-600 outline-dotted"
        data-node-id={props.nodeId}
        data-node-type={getType(node)}
      >
        <div className="text-xs font-mono text-cyan-600 p-1 border-b border-cyan-600 border-dotted">
          {getType(node)}: {props.nodeId}
        </div>
        <div className="p-0.5">{props.element}</div>
      </div>
    </div>
  );
});
