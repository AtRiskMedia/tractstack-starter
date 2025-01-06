import { useEffect, useState } from "react";
import { getCtx } from "@/store/nodes.ts";
import {
  TemplateAsideNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplateH4Node,
  TemplateImgNode,
  TemplatePNode,
} from "@/utils/TemplateNodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import type { MarkdownPaneFragmentNode, ParentClassesPayload } from "@/types.ts";

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
  let nodesToRender = <RenderChildren children={children} nodeProps={props} />;
  if ("parentClasses" in node) {
    for (let i = (node.parentClasses as ParentClassesPayload)?.length; i > 0; --i) {
      nodesToRender = (
        <div
          onClick={(e) => {
            getCtx(props).setClickedParentLayer(i);
            getCtx(props).setClickedNodeId(props.nodeId);
            e.stopPropagation();
          }}
          className={getCtx(props).getNodeClasses(id, viewportStore.get().value, i - 1)}
        >
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
