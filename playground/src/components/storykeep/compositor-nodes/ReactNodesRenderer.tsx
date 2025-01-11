import { getCtx, NodesContext, ROOT_NODE_NAME } from "@/store/nodes.ts";
import { useEffect, useState } from "react";
import type { StoryKeepAllNodes } from "@/types.ts";
import { TemplateSimplePane } from "@/utils/TemplatePanes.ts";
import { timestampNodeId } from "@/utils/common/helpers.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { markdownToNodes } from "@/utils/common/nodesMarkdownGenerator.ts";

export type ReactNodesRendererProps = {
  nodes: StoryKeepAllNodes | null;
  ctx?: NodesContext;
  id: string;
};

export const ReactNodesRenderer = (props: ReactNodesRendererProps) => {
  const [renderTime, setRenderTime] = useState<number>(0);

  useEffect(() => {
    getCtx(props).buildNodesTreeFromFragmentNodes(props.nodes);
    setRenderTime(Date.now());

    const markdown =
      "make an *engaging* [awesome website](https://example.com), **very-very** fast!!";
    console.log(markdownToNodes(markdown, "test-parent-id"));

    const unsubscribe = getCtx(props).notifications.subscribe(ROOT_NODE_NAME, () => {
      console.log("notification received data update for root node");
      setRenderTime(Date.now());
    });
    return unsubscribe;
  }, []);

  return (
    <>
      {renderTime > 0 ? (
        <Node nodeId={props.id} key={timestampNodeId(props.id)} ctx={props.ctx} />
      ) : (
        <></>
      )}
    </>
  );
};

//      <>
//        <div className="flex gap-x-2">
//          <button
//            className="bg-cyan-500 rounded-md p-2"
//            onClick={() => {
//              const storyFragment = getCtx(props)
//                .allNodes.get()
//                .values()
//                .find((x) => x.nodeType === "StoryFragment");
//              if (storyFragment && storyFragment.id !== null) {
//                getCtx(props).addTemplatePane(storyFragment.id, TemplateSimplePane);
//              }
//            }}
//          >
//            Add Pane
//          </button>
//        </div>
//      </>
