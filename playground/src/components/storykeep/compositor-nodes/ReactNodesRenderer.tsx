import { useEffect, useState } from "react";
import { getCtx, ROOT_NODE_NAME, type NodesContext } from "@/store/nodes.ts";
import { timestampNodeId, stopLoadingAnimation } from "@/utils/common/helpers.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
import type { LoadData } from "@/store/nodesSerializer.ts";
import type { Config } from "@/types.ts";

export type ReactNodesRendererProps = {
  nodes: LoadData | null;
  ctx?: NodesContext;
  id: string;
  config: Config;
};

export const ReactNodesRenderer = (props: ReactNodesRendererProps) => {
  const [renderTime, setRenderTime] = useState<number>(0);

  useEffect(() => {
    getCtx(props).buildNodesTreeFromRowDataMadeNodes(props.nodes);
    setRenderTime(Date.now());

    const unsubscribe = getCtx(props).notifications.subscribe(ROOT_NODE_NAME, () => {
      setRenderTime(Date.now());
      setTimeout(() => stopLoadingAnimation(), 160);
    });

    return () => {
      unsubscribe();
      stopLoadingAnimation();
    };
  }, []);

  return (
    <>
      {renderTime > 0 ? (
        <Node
          nodeId={props.id}
          key={timestampNodeId(props.id)}
          ctx={props.ctx}
          config={props.config}
        />
      ) : (
        <></>
      )}
    </>
  );
};
