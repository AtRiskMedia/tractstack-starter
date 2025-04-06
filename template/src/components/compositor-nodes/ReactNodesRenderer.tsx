import { useEffect, useState } from "react";
import { getCtx, ROOT_NODE_NAME, type NodesContext } from "@/store/nodes.ts";
import { stopLoadingAnimation } from "@/utils/common/helpers.ts";
import Node from "@/components/compositor-nodes/Node.tsx";
import type { LoadData } from "@/store/nodesSerializer.ts";
import type { Config } from "@/types.ts";

export type ReactNodesRendererProps = {
  nodes: LoadData | null;
  ctx?: NodesContext;
  id: string;
  config: Config;
};

export const ReactNodesRenderer = (props: ReactNodesRendererProps) => {
  const [initialized, setInitialized] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  useEffect(() => {
    getCtx(props).buildNodesTreeFromRowDataMadeNodes(props.nodes);
    setInitialized(true);

    const unsubscribe = getCtx(props).notifications.subscribe(ROOT_NODE_NAME, () => {
      setUpdateCounter((prev) => prev + 1);
      setTimeout(() => stopLoadingAnimation(), 160);
    });

    return () => {
      unsubscribe();
      stopLoadingAnimation();
    };
  }, []);

  if (!initialized) return null;

  return (
    <Node
      nodeId={props.id}
      key={`${props.id}-${updateCounter}`}
      ctx={props.ctx}
      config={props.config}
    />
  );
};
