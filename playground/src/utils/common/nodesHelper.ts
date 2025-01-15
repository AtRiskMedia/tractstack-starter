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

export function parseMarkdownToNodes(text: string, parentId: string): FlatNode[] {
  text = text
    .replace(/&nbsp;|\u00A0/g, "")
    .replace("<br>", "")
    .replace(/\[\[(.+?)\]\]/g, "<a>$1</a>")
    .replace(/(?<!<a[^>]*?>[^<]*)\*\*(.+?)\*\*(?![^<]*?<\/a>)/g, "<strong>$1</strong>")
    .replace(/(?<!<a[^>]*?>[^<]*)\*(.+?)\*(?![^<]*?<\/a>)/g, "<em>$1</em>");

  const nodes = extractNodes(text, parentId);

  const mergedNodes = mergeConsecutiveNodes(parentId, nodes);
  const finalNodes = extractTextIntoSeparateNodes(mergedNodes);
  return finalNodes;
}

function extractHref(str: string) {
  const match = str.match(/href="([^"]*)"/);
  return match ? match[1] : null;
}

function extractNodes(inputString: string, parentId: string): FlatNode[] {
  const result: FlatNode[] = [];
  const parentsStack: string[] = [];
  const hrefs: string[] = [];
  let buffer = "";
  let inLink = false;

  for (let i = 0; i < inputString.length; ++i) {
    buffer += inputString[i];
    if (inputString.startsWith("</a", i)) {
      inLink = false;
    }

    if (inputString[i] === "<") {
      if (!inLink) {
        const parentType = parentsStack.length === 0 ? "text" : parentsStack.last();
        buffer = buffer.replace("<", "").trim();
        if (buffer.length > 0) {
          result.push({
            id: ulid(),
            copy: buffer,
            tagName: parentType,
            nodeType: "TagElement",
            href: hrefs.pop(),
            parentId,
          });
        }
      }

      if (i + 1 < inputString.length && inputString[i + 1] == "/") {
        parentsStack.pop();
      }

      if (inputString.startsWith("<a", i)) {
        inLink = true;
        buffer = "";
        parentsStack.push("a");
      } else if (inputString.startsWith("</a", i)) {
        inLink = false;
        parentsStack.pop();
      } else if (!inLink) {
        if (inputString.startsWith("<em", i)) {
          parentsStack.push("em");
        } else if (inputString.startsWith("<strong", i)) {
          parentsStack.push("strong");
        }
      }
      buffer = "";
    } else if (inputString[i] === ">") {
      const href = extractHref(buffer);
      if (href !== null) {
        hrefs.push(href);
      }
      buffer = "";
    }
  }

  const parentType = parentsStack.length === 0 ? "text" : parentsStack.pop();
  buffer = buffer.replace("<", "").trim();
  if (buffer.length > 0) {
    result.push({
      id: ulid(),
      copy: buffer,
      tagName: parentType || "text",
      nodeType: "TagElement",
      href: hrefs.pop(),
      parentId,
    });
  }

  return result;
}

function extractTextIntoSeparateNodes(nodes: FlatNode[]): FlatNode[] {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (["em", "strong", "a"].includes(node.tagName)) {
      const nodesToInsert = [
        {
          id: ulid(),
          parentId: node.id,
          copy: node.copy,
          tagName: "text",
          nodeType: "TagElement",
        } as FlatNode,
      ];
      if (node.tagName === "a") {
        // add extra space
        nodesToInsert.push({
          id: ulid(),
          parentId: node.parentId,
          copy: " ",
          tagName: "text",
          nodeType: "TagElement",
        } as FlatNode);
      }
      nodes.insertAfter(i, nodesToInsert);
      node.copy = undefined;
    }
  }
  return nodes;
}

function mergeConsecutiveNodes(parentId: string, nodes: FlatNode[]): FlatNode[] {
  const mergedNodes: FlatNode[] = [];
  let lastNode: FlatNode | null = null;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.copy?.length === 0) {
      nodes.splice(i, 1);
      --i;
      continue;
    }
    if (
      lastNode &&
      node.tagName === lastNode.tagName &&
      node.parentId === lastNode.parentId &&
      ["em", "text", "strong"].includes(node.tagName)
    ) {
      // Merge copy content into the last node
      lastNode.copy = (lastNode.copy || "") + (node.copy || "");
    } else {
      mergedNodes.push(node);
      lastNode = node;
    }
  }

  return mergedNodes;
}
