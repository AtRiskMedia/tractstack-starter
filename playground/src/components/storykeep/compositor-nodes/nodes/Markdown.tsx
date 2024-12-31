import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { MarkdownPaneFragmentNode } from "@/types.ts";
import { viewportStore } from "@/store/storykeep.ts";
import {
  TemplateAsideNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplateH4Node,
  TemplateImgNode,
  TemplatePNode,
} from "@/utils/TemplateNodes.ts";
import { useEffect, useState } from "react";
import { timestampNodeId } from "@/utils/common/helpers.ts";

export const Markdown = (props: NodeProps) => {
  const id = props.nodeId;
  const node = getCtx(props).allNodes.get().get(props.nodeId) as MarkdownPaneFragmentNode;
  const [children, setChildren] = useState<string[]>([
    ...getCtx(props).getChildNodeIDs(props.nodeId),
  ]);

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for markdown node: " + props.nodeId);
      setChildren([...getCtx(props).getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  console.log("draw markdown: " + props.nodeId);
  let nodesToRender = (
    <>
      {children.map((id: string) => (
        <Node nodeId={id} key={timestampNodeId(id)} ctx={props.ctx} />
      ))}
    </>
  );
  if ("parentCss" in node) {
    for (let i = (node.parentCss as string[])?.length; i > 0; --i) {
      nodesToRender = (
        <div className={getCtx(props).getNodeClasses(id, viewportStore.get().value, i - 1)}>
          {nodesToRender}
        </div>
      );
    }
  }
  return (
    <>
      {nodesToRender}
      <div className="flex gap-x-2">
        <button
          className="bg-yellow-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).addTemplateNode(props.nodeId, TemplateH2Node);
          }}
        >
          Add H2
        </button>
        <button
          className="bg-yellow-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).addTemplateNode(
              props.nodeId,
              TemplateH3Node,
              children[children.length - 1],
              "after"
            );
          }}
        >
          Add H3
        </button>
        <button
          className="bg-yellow-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).addTemplateNode(
              props.nodeId,
              TemplatePNode,
              children[children.length - 1],
              "after"
            );
          }}
        >
          Add P
        </button>
        <button
          className="bg-yellow-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).addTemplateNode(
              props.nodeId,
              TemplateH4Node,
              children[children.length - 1],
              "after"
            );
          }}
        >
          Add H4
        </button>
        <button
          className="bg-yellow-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).addTemplateNode(
              props.nodeId,
              TemplateAsideNode,
              children[children.length - 1],
              "after"
            );
          }}
        >
          Add Aside
        </button>
        <button
          className="bg-yellow-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).addTemplateNode(
              props.nodeId,
              TemplateImgNode,
              children[children.length - 1],
              "after"
            );
          }}
        >
          Add Img
        </button>
        <button
          className="bg-red-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).deleteNode(children[children.length - 1]);
          }}
        >
          DELETE LAST
        </button>
        <button
          className="bg-red-500 rounded-md p-2"
          onClick={() => {
            getCtx(props).deleteNode(children[0]);
          }}
        >
          DELETE FIRST
        </button>
      </div>
    </>
  );
};
