import { getCtx, NodesContext, ROOT_NODE_NAME } from "@/store/nodes.ts";
import { useEffect, useState } from "react";
import type { LoadData } from "@/store/nodesSerializer.ts";
import { timestampNodeId } from "@/utils/common/helpers.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
//import { TemplateSimplePane } from "@/utils/TemplatePanes.ts";
//import { timestampNodeId } from "@/utils/common/helpers.ts";
//import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
//import { markdownToNodes } from "@/utils/common/nodesMarkdownGenerator.ts";
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
    //getCtx(props).buildNodesTreeFromFragmentNodes(props.nodes);
    setRenderTime(Date.now());

    const unsubscribe = getCtx(props).notifications.subscribe(ROOT_NODE_NAME, () => {
      console.log("notification received data update for root node");
      setRenderTime(Date.now());
    });
    return unsubscribe;
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
