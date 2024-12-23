import { allNodes } from "@/store/nodes.ts";
import type { BaseNode } from "@/types.ts";
import type { ReactElement } from "react";
import { Pane } from "@/components/storykeep/compositor-nodes/elements/Pane.tsx";
import { Element } from "@/components/storykeep/compositor-nodes/elements/Element.tsx";
import { StoryFragment } from "@/components/storykeep/compositor-nodes/elements/StoryFragment.tsx";
import { Root } from "@/components/storykeep/compositor-nodes/elements/Root.tsx";

export type NodeProps = {
  id: string;
}

const getElement = (node: BaseNode): ReactElement => {
  switch (node.nodeType) {
    case "Element":
      return <Element id={node.id}/>;
    case "StoryFragment":
      return <StoryFragment id={node.id}/>;
    case "Pane":
      return <Pane id={node.id} />;
    case "Root":
      return <Root id={node.id} />;
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