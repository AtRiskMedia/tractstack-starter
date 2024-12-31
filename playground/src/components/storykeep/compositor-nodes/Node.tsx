import { getCtx, NodesContext } from "@/store/nodes.ts";
import type { BaseNode, FlatNode } from "@/types.ts";
import { memo, type ReactElement } from "react";
import { Pane } from "@/components/storykeep/compositor-nodes/nodes/Pane.tsx";
import { Markdown } from "@/components/storykeep/compositor-nodes/nodes/Markdown.tsx";
import { BgPaneWrapper } from "@/components/storykeep/compositor-nodes/nodes/BgPaneWrapper.tsx";
import { StoryFragment } from "@/components/storykeep/compositor-nodes/nodes/StoryFragment.tsx";
import { NodeText } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeText.tsx";
import { NodeA } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeA.tsx";
import { NodeButton } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeButton.tsx";
import { NodeImg } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeImg.tsx";
import { TagElement } from "@/components/storykeep/compositor-nodes/nodes/TagElement.tsx";
import { NodeBasicTag } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";
import { Widget } from "@/components/storykeep/compositor-nodes/nodes/Widget.tsx";
import { timestampNodeId } from "@/utils/common/helpers.ts";

export type NodeProps = {
  nodeId: string;
  ctx?: NodesContext;
};

// Helper function to parse code hooks
function parseCodeHook(node: BaseNode | FlatNode) {
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

  // Type guard to check if it's a FlatNode with children
  if ("children" in node && Array.isArray(node.children)) {
    const firstChild = node.children[0];
    if (!firstChild?.value) return null;

    const regexpHook =
      /(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*?)\)/;
    const regexpValues = /((?:[^\\|]+|\\\|?)+)/g;
    const hookMatch = firstChild.value.match(regexpHook);

    if (!hookMatch) return null;

    const hook = hookMatch[1];
    const hookValuesRaw = hookMatch[2].match(regexpValues);

    return {
      hook,
      value1: hookValuesRaw?.[0] || null,
      value2: hookValuesRaw?.[1] || null,
      value3: hookValuesRaw?.[2] || "",
    };
  }

  return null;
}

const getElement = (node: BaseNode | FlatNode, props: NodeProps): ReactElement => {
  if (node === undefined) return <></>;

  let type = node.nodeType as string;
  if ("tagName" in node) {
    type = node.tagName;
  }

  const sharedProps = { nodeId: node.id, ctx: props.ctx, key: timestampNodeId(node.id) };

  switch (type) {
    // generic nodes, not tag (html) elements
    case "Markdown":
      return <Markdown {...sharedProps} />;
    case "StoryFragment":
      return <StoryFragment {...sharedProps} />;
    case "Pane":
      return <Pane {...sharedProps} />;
    case "BgPane":
      return <BgPaneWrapper {...sharedProps} />;
    case "TagElement":
      return <TagElement {...sharedProps} />;
    // tag elements
    case "em":
    case "h2":
    case "h3":
    case "h4":
    case "ol":
    case "ul":
    case "li":
    case "strong":
    case "aside":
    case "p":
      return <NodeBasicTag {...sharedProps} tagName={type} />;

    case "text":
      return <NodeText {...sharedProps} />;
    case "button":
      return <NodeButton {...sharedProps} />;
    case "a":
      return <NodeA {...sharedProps} />;
    case "img":
      return <NodeImg {...sharedProps} />;
    case "code": {
      const hookData = parseCodeHook(node);
      return hookData ? (
        <Widget {...hookData} {...sharedProps} />
      ) : (
        <></>
      );
    }
    case "Impression":
      return <></>;
    default:
      console.log(`Node.tsx miss on ${type}`);
      return <></>;
  }
};

export const Node = memo((props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  return getElement(node, props);
});
