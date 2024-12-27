import { allNodes } from "@/store/nodes.ts";
import type { BaseNode, FlatNode } from "@/types.ts";
import type { ReactElement } from "react";
import { Pane } from "@/components/storykeep/compositor-nodes/nodes/Pane.tsx";
import { Markdown } from "@/components/storykeep/compositor-nodes/nodes/Markdown.tsx";
import { StoryFragment } from "@/components/storykeep/compositor-nodes/nodes/StoryFragment.tsx";
import { Root } from "@/components/storykeep/compositor-nodes/nodes/Root.tsx";
import { NodeText } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeText.tsx";
import { NodeA } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeA.tsx";
import { NodeImg } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeImg.tsx";
import { TagElement } from "@/components/storykeep/compositor-nodes/nodes/TagElement.tsx";
import { NodeBasicTag } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";

export type NodeProps = {
  nodeId: string;
}

const getElement = (node: BaseNode|FlatNode): ReactElement => {
  let type = node.nodeType as string;
  if("tagName" in node) {
    type = node.tagName;
  }

  switch (type) {
    // generic nodes, not tag (html) elements
    case "Markdown":return <Markdown nodeId={node.id}/>;
    case "StoryFragment":return <StoryFragment nodeId={node.id}/>;
    case "Pane":return <Pane nodeId={node.id} />;
    case "Root":return <Root nodeId={node.id} />;
    case "TagElement": return <TagElement nodeId={node.id} />;
    // tag elements
    case "em":
    case "h2":
    case "h3":
    case "ol":
    case "ul":
    case "li":
    case "strong":
    case "p":
      return <NodeBasicTag tagName={type} nodeId={node.id} />;

    case "text":return <NodeText nodeId={node.id} />;
    case "a":return <NodeA nodeId={node.id} />;
    case "img":return <NodeImg nodeId={node.id} />;
    default:
      return <></>;
  }
}

export const Node = (props: NodeProps) => {
  const node = allNodes.get().get(props.nodeId);
  if(node) {
    return getElement(node);
  } else {
    return <></>;
  }
}