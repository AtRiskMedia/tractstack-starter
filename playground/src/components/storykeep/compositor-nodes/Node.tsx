import { allNodes } from "@/store/nodes.ts";
import type { BaseNode, FlatNode } from "@/types.ts";
import type { ReactElement } from "react";
import { Pane } from "@/components/storykeep/compositor-nodes/nodes/Pane.tsx";
import { Markdown } from "@/components/storykeep/compositor-nodes/nodes/Markdown.tsx";
import { StoryFragment } from "@/components/storykeep/compositor-nodes/nodes/StoryFragment.tsx";
import { Root } from "@/components/storykeep/compositor-nodes/nodes/Root.tsx";
import { NodeH2 } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeH2.tsx";
import { NodeH3 } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeH3.tsx";
import { NodeText } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeText.tsx";
import { NodeP } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeP.tsx";
import { NodeEm } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeEm.tsx";
import { NodeA } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeA.tsx";
import { NodeImg } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeImg.tsx";
import { NodeOl } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeOl.tsx";
import { NodeUl } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeUl.tsx";
import { NodeLi } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeLi.tsx";
import { TagElement } from "@/components/storykeep/compositor-nodes/nodes/TagElement.tsx";

export type NodeProps = {
  id: string;
}

const getElement = (node: BaseNode|FlatNode): ReactElement => {
  let type = node.nodeType as string;
  if("tagName" in node) {
    type = node.tagName;
  }

  switch (type) {
    // generic nodes, not tag (html) elements
    case "Markdown":return <Markdown id={node.id}/>;
    case "StoryFragment":return <StoryFragment id={node.id}/>;
    case "Pane":return <Pane id={node.id} />;
    case "Root":return <Root id={node.id} />;
    case "TagElement": return <TagElement id={node.id} />;
    // tag elements
    case "h2":return <NodeH2 id={node.id} />;
    case "h3":return <NodeH3 id={node.id} />;
    case "text":return <NodeText id={node.id} />;
    case "p":return <NodeP id={node.id} />;
    case "em":return <NodeEm id={node.id} />;
    case "a":return <NodeA id={node.id} />;
    case "img":return <NodeImg id={node.id} />;
    case "ol": return <NodeOl id={node.id}/>;
    case "ul": return <NodeUl id={node.id}/>;
    case "li": return <NodeLi id={node.id}/>;
    default:
      return <></>;
  }
}

export const Node = (props: NodeProps) => {
  const node = allNodes.get().get(props.id);
  if(node) {
    return getElement(node);
  } else {
    return <></>;
  }
}