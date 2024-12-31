import { getCtx, NodesContext, ROOT_NODE_NAME } from "@/store/nodes.ts";
import { useEffect, useState } from "react";
import type { StoryKeepAllNodes } from "@/types.ts";
import { TemplateSimplePane } from "@/utils/TemplatePanes.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { timestampNodeId } from "@/utils/common/helpers.ts";

export type ReactNodesRendererProps = {
  nodes: StoryKeepAllNodes | null;
  ctx?: NodesContext;
  id: string;
  bgColor: string;
};

export const ReactNodesRenderer = (props: ReactNodesRendererProps) => {
  const [children, setChildren] = useState<string[]>([]);

  useEffect(() => {
    getCtx(props).buildNodesTreeFromFragmentNodes(props.nodes);
    const rootId = props.id || getCtx(props).rootNodeId.get();
    setChildren(getCtx(props).getChildNodeIDs(rootId));

    const unsubscribe = getCtx(props).notifications.subscribe(ROOT_NODE_NAME, () => {
      console.log("notification received data update for root node");
      setChildren([...getCtx(props).getChildNodeIDs(rootId)]);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      {children.length > 0 ? (
        children.map((id: string) => <Node nodeId={id} key={timestampNodeId(id)} ctx={props.ctx} />)
      ) : (
        <></>
      )}
      <>
        <div className="flex gap-x-2">
          <button
            className="bg-cyan-500 rounded-md p-2"
            onClick={() => {
              const storyFragment = getCtx(props)
                .allNodes.get()
                .values()
                .find((x) => x.nodeType === "StoryFragment");
              if (storyFragment && storyFragment.id !== null) {
                getCtx(props).addTemplatePane(storyFragment.id, TemplateSimplePane);
              }
            }}
          >
            Add Pane
          </button>
        </div>
      </>
    </>
  );
};
