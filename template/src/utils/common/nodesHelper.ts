import type { FlatNode, TemplateNode, ToolAddMode } from "@/types.ts";
import {
  TemplateBeliefNode,
  TemplateBunnyNode,
  TemplateEmailSignUpNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplateH4Node,
  TemplateIdentifyAsNode,
  TemplateImgNode,
  TemplatePNode,
  TemplateToggleNode,
  TemplateYoutubeNode,
} from "@/utils/TemplateNodes.ts";
import { getCtx } from "@/store/nodes.ts";
import type { NodeTagProps } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";
import { ulid } from "ulid";

export const getTemplateNode = (value: ToolAddMode): TemplateNode => {
  switch (value) {
    case "h2":
      return TemplateH2Node;
    case "h3":
      return TemplateH3Node;
    case "h4":
      return TemplateH4Node;
    case "img":
      return TemplateImgNode;
    case "toggle":
      return TemplateToggleNode;
    case "yt":
      return TemplateYoutubeNode;
    case "belief":
      return TemplateBeliefNode;
    case "bunny":
      return TemplateBunnyNode;
    case "signup":
      return TemplateEmailSignUpNode;
    case "identify":
      return TemplateIdentifyAsNode;

    case "p":
    default:
      return TemplatePNode;
  }
};

const forbiddenEditTags = new Set<string>(["em", "strong", "ol", "ul"]);

export const canEditText = (props: NodeTagProps): boolean => {
  const nodeId = props.nodeId;

  const self = getCtx(props).allNodes.get().get(nodeId) as FlatNode;
  if (self.tagName === "a") return false;

  //const forbiddenChildren = getCtx(props).getChildNodeByTagNames(nodeId, ["a"]);
  //if (forbiddenChildren?.length > 0) return false;

  const parentIsButton = getCtx(props).getParentNodeByTagNames(nodeId, ["a"]);
  if (parentIsButton?.length > 0) return false;

  if (forbiddenEditTags.has(props.tagName)) return false;
  return true;
};

type NodeObject = { tag: "text" | "em" | "strong" | string; text: string };

export const parseInnerHtmlToNodeObjects = (htmlString: string): NodeObject[] => {
  const container = document.createElement("div");
  container.innerHTML = htmlString;

  const result: NodeObject[] = [];

  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Handle plain text nodes
      if (node.textContent?.trim()) {
        result.push({ tag: "text", text: node.textContent.trim() });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elementNode = node as HTMLElement;
      const tagName = elementNode.tagName.toLowerCase();
      if (["em", "strong"].includes(tagName)) {
        result.push({ tag: tagName, text: elementNode.textContent?.trim() || "" });
      } else {
        // Handle other element types if necessary
        result.push({ tag: tagName, text: elementNode.outerHTML });
      }
    }
  });
  return result;
};

function parseMarkdownToNodes(text: string, parentId: string): FlatNode[] {
  function createNode(
    tagName: string,
    copy: string | undefined,
    parentId: string
  ): FlatNode {
    return {
      id: ulid(),
      nodeType: "TagElement",
      parentId,
      tagName: tagName !== "text" ? tagName : "text",
      copy,
    };
  }

  const nodes: FlatNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|([^*]+))/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match[2]) {
      const strongNode = createNode("strong", undefined, parentId);
      nodes.push(strongNode);
      nodes.push(createNode("text", match[2], strongNode.id));
    } else if (match[3]) {
      const emNode = createNode("em", undefined, parentId);
      nodes.push(emNode);
      nodes.push(createNode("text", match[3], emNode.id));
    } else if (match[4]?.trim()) {
      nodes.push(createNode("text", match[4].trim(), parentId));
    }
  }

  return nodes;
}

export function innerHtmlToNodes(innerHtml: string, parentId: string): FlatNode[] {
  function createNode(
    tagName: string,
    copy: string | undefined,
    parentId: string,
    href?: string
  ): FlatNode {
    return {
      id: ulid(),
      nodeType: "TagElement",
      parentId,
      tagName: tagName !== "text" ? tagName : "text",
      copy: tagName === "text" ? copy : undefined,
      href,
    };
  }

  const resultNodes: FlatNode[] = [];
  const parsedObjects = parseInnerHtmlToNodeObjects(innerHtml);

  let mergedText = "";

  parsedObjects.forEach(({ tag, text }, index) => {
    if (tag === "text") {
      mergedText += text;

      // Check if next tag is not text or we're at the last index to finalize merging
      const nextTag = parsedObjects[index + 1]?.tag;
      if (nextTag !== "text" || index === parsedObjects.length - 1) {
        const markdownNodes = parseMarkdownToNodes(mergedText.trim(), parentId);
        resultNodes.push(...markdownNodes);
        mergedText = "";
      }
    } else {
      if (mergedText) {
        const markdownNodes = parseMarkdownToNodes(mergedText.trim(), parentId);
        resultNodes.push(...markdownNodes);
        mergedText = "";
      }

      const tagNode = createNode(tag, undefined, parentId);
      resultNodes.push(tagNode);
      resultNodes.push(createNode("text", text, tagNode.id));
    }
  });

  return resultNodes;
}