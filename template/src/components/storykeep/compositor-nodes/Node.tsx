import { allNodes } from "@/store/nodes.ts";
import type { BaseNode, FlatNode } from "@/types.ts";
import { memo, type ReactElement } from "react";
import { Pane } from "@/components/storykeep/compositor-nodes/nodes/Pane.tsx";
import { Markdown } from "@/components/storykeep/compositor-nodes/nodes/Markdown.tsx";
import { BgPaneWrapper } from "@/components/storykeep/compositor-nodes/nodes/BgPaneWrapper.tsx";
import { StoryFragment } from "@/components/storykeep/compositor-nodes/nodes/StoryFragment.tsx";
import { Root } from "@/components/storykeep/compositor-nodes/nodes/Root.tsx";
import { NodeText } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeText.tsx";
import { NodeA } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeA.tsx";
import { NodeButton } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeButton.tsx";
import { NodeImg } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeImg.tsx";
import { TagElement } from "@/components/storykeep/compositor-nodes/nodes/TagElement.tsx";
import { NodeBasicTag } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";
import { Widget } from "@/components/storykeep/compositor-nodes/nodes/Widget.tsx";

export type NodeProps = {
  nodeId: string;
};

// Helper function to parse code hooks
const parseCodeHook = (node: BaseNode | FlatNode) => {
  // First check if we have codeHookParams
  if ("codeHookParams" in node && Array.isArray(node.codeHookParams)) {
    const regexpHook =
      /^(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*)\)$/;
    const hookMatch = node.copy?.match(regexpHook);

    if (!hookMatch) return null;

    return {
      hook: hookMatch[1],
      value1: node.codeHookParams[0] || null,
      value2: node.codeHookParams[1] || null,
      value3: node.codeHookParams[2] || "",
    };
  }

  // Fallback to checking children if no codeHookParams
  if (!("children" in node) || !node.children?.[0]?.value) return null;

  const regexpHook =
    /(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*?)\)/;
  const regexpValues = /((?:[^\\|]+|\\\|?)+)/g;
  const hookMatch = node.children[0].value.match(regexpHook);

  if (!hookMatch) return null;

  const hook = hookMatch[1];
  const hookValuesRaw = hookMatch[2].match(regexpValues);

  return {
    hook,
    value1: hookValuesRaw?.[0] || null,
    value2: hookValuesRaw?.[1] || null,
    value3: hookValuesRaw?.[2] || "",
  };
};

const getElement = (node: BaseNode | FlatNode): ReactElement => {
  if (node === undefined) return <></>;

  let type = node.nodeType as string;
  if ("tagName" in node) {
    type = node.tagName;
  }

  switch (type) {
    // generic nodes, not tag (html) elements
    case "Markdown":
      return <Markdown nodeId={node.id} />;
    case "StoryFragment":
      return <StoryFragment nodeId={node.id} />;
    case "Pane":
      return <Pane nodeId={node.id} />;
    case "BgPane":
      return <BgPaneWrapper nodeId={node.id} />;
    case "Root":
      return <Root nodeId={node.id} />;
    case "TagElement":
      return <TagElement nodeId={node.id} />;
    // tag elements
    case "em":
    case "h2":
    case "h3":
    case "h4":
    case "ol":
    case "ul":
    case "li":
    case "strong":
    case "p":
      return <NodeBasicTag tagName={type} nodeId={node.id} />;

    case "text":
      return <NodeText nodeId={node.id} />;
    case "button":
      return <NodeButton nodeId={node.id} />;
    case "a":
      return <NodeA nodeId={node.id} />;
    case "img":
      return <NodeImg nodeId={node.id} />;
    case "code": {
      const hookData = parseCodeHook(node);
      return hookData ? <Widget {...hookData} /> : <></>;
    }
    default:
      console.log(`miss on ${type}`);
      return <></>;
  }
};

export const Node = memo((props: NodeProps) => {
  const node = allNodes.get().get(props.nodeId) as FlatNode;
  return getElement(node);
});
