import type { BaseNode, FlatNode, StoryFragmentNode, TemplateNode, ToolAddMode } from "@/types.ts";
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
import { getCtx, NodesContext } from "@/store/nodes.ts";
import type { NodeTagProps } from "@/components/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";
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
  // Clean input text - collapse multiple spaces and handle special characters
  text = text
    .replace(/&nbsp;|\u00A0/g, " ")
    .replace(/<br>/g, "")
    .replace(/\[\[(.+?)\]\]/g, "<a>$1</a>")
    .replace(/(?<!<a[^>]*?>[^<]*)\*\*(.+?)\*\*(?![^<]*?<\/a>)/g, "<strong>$1</strong>")
    .replace(/(?<!<a[^>]*?>[^<]*)\*(.+?)\*(?![^<]*?<\/a>)/g, "<em>$1</em>");

  // Get initial nodes
  const nodes = extractNodes(text, parentId);

  // Merge consecutive text nodes and handle spaces
  const mergedNodes = mergeConsecutiveNodes(parentId, nodes);

  // Extract text into separate nodes and handle spacing
  const finalNodes = extractTextIntoSeparateNodes(mergedNodes);

  return finalNodes;
}

function mergeConsecutiveNodes(parentId: string, nodes: FlatNode[]): FlatNode[] {
  const mergedNodes: FlatNode[] = [];
  let lastNode: FlatNode | null = null;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node.copy?.length) {
      continue;
    }

    if (
      lastNode &&
      node.tagName === lastNode.tagName &&
      node.parentId === lastNode.parentId &&
      ["text", "em", "strong"].includes(node.tagName)
    ) {
      // Merge text content, ensuring single spaces between words
      const combinedText = `${lastNode.copy || ""} ${node.copy || ""}`.replace(/\s+/g, " ");
      lastNode.copy = combinedText;
    } else {
      mergedNodes.push(node);
      lastNode = node;
    }
  }

  return mergedNodes;
}

function extractTextIntoSeparateNodes(nodes: FlatNode[]): FlatNode[] {
  const result: FlatNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (["em", "strong", "a"].includes(node.tagName)) {
      // Create the wrapper node
      const wrapperNode = { ...node };
      delete wrapperNode.copy;
      result.push(wrapperNode);

      // Create the text content node
      if (node.copy) {
        result.push({
          id: ulid(),
          parentId: wrapperNode.id,
          copy: node.copy.trim(),
          tagName: "text",
          nodeType: "TagElement",
        } as FlatNode);
      }

      // Add space after if needed
      if (i < nodes.length - 1 && nodes[i + 1].tagName !== "text") {
        result.push({
          id: ulid(),
          parentId: node.parentId,
          copy: " ",
          tagName: "text",
          nodeType: "TagElement",
        } as FlatNode);
      }
    } else {
      result.push(node);
    }
  }

  return result;
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

export function moveNodeAtLocationInContext(
  oldParentNodes: string[],
  originalIdx: number,
  newLocationNode: BaseNode,
  insertNodeId: string,
  nodeId: string,
  location: "before" | "after",
  node: BaseNode,
  ctx: NodesContext
) {
  if (oldParentNodes) {
    oldParentNodes.splice(originalIdx, 1);
  }

  const newLocationParentNodes = ctx.getChildNodeIDs(newLocationNode.parentId || "");
  // now grab parent nodes, check if we have inner node
  if (
    insertNodeId &&
    newLocationParentNodes &&
    newLocationParentNodes?.indexOf(insertNodeId) !== -1
  ) {
    const spliceIdx = newLocationParentNodes.indexOf(nodeId);
    if (spliceIdx !== -1) {
      newLocationParentNodes.splice(newLocationParentNodes.indexOf(nodeId), 1);
    }
    if (location === "before") {
      newLocationParentNodes.insertBefore(newLocationParentNodes.indexOf(insertNodeId), [nodeId]);
    } else {
      newLocationParentNodes.insertAfter(newLocationParentNodes.indexOf(insertNodeId), [nodeId]);
    }
  }

  if (node.nodeType === "Pane") {
    const storyFragmentId = ctx.getClosestNodeTypeFromId(node.id, "StoryFragment");
    const storyFragment = ctx.allNodes.get().get(storyFragmentId) as StoryFragmentNode;
    if (storyFragment) {
      const spliceIdx = storyFragment.paneIds.indexOf(nodeId);
      if (spliceIdx !== -1) {
        storyFragment.paneIds.splice(spliceIdx, 1);
      }
      if (location === "before") {
        storyFragment.paneIds.insertBefore(storyFragment.paneIds.indexOf(insertNodeId), [nodeId]);
      } else {
        storyFragment.paneIds.insertAfter(storyFragment.paneIds.indexOf(insertNodeId), [nodeId]);
      }
    }
  }
  node.parentId = newLocationNode.parentId;
}

export function createEmptyStorykeep(id: string) {
  return {
    id,
    nodeType: "StoryFragment",
    parentId: null,
    isChanged: false,
    paneIds: [],
    changed: undefined,
    slug: "temp",
    hasMenu: false,
    title: "temp",
    impressions: [],
    created: undefined,
    menuId: undefined,
    socialImagePath: undefined,
    tailwindBgColour: undefined,
  } as StoryFragmentNode;
}
