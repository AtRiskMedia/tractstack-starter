import { ulid } from "ulid";
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
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { NodeTagProps } from "@/components/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";
import type { BaseNode, FlatNode, StoryFragmentNode, TemplateNode, ToolAddMode } from "@/types.ts";

export const getTemplateNode = (value: ToolAddMode): TemplateNode => {
  let templateNode: TemplateNode;
  switch (value) {
    case "h2":
      templateNode = cloneDeep(TemplateH2Node);
      break;
    case "h3":
      templateNode = cloneDeep(TemplateH3Node);
      break;
    case "h4":
      templateNode = cloneDeep(TemplateH4Node);
      break;
    case "img":
      templateNode = cloneDeep(TemplateImgNode);
      break;
    case "toggle":
      templateNode = cloneDeep(TemplateToggleNode);
      break;
    case "yt":
      templateNode = cloneDeep(TemplateYoutubeNode);
      break;
    case "belief":
      templateNode = cloneDeep(TemplateBeliefNode);
      break;
    case "bunny":
      templateNode = cloneDeep(TemplateBunnyNode);
      break;
    case "signup":
      templateNode = cloneDeep(TemplateEmailSignUpNode);
      break;
    case "identify":
      templateNode = cloneDeep(TemplateIdentifyAsNode);
      break;
    case "p":
    default:
      templateNode = cloneDeep(TemplatePNode);
      break;
  }
  return templateNode;
};

const forbiddenEditTags = new Set<string>(["em", "strong", "ol", "ul"]);

export const canEditText = (props: NodeTagProps): boolean => {
  const nodeId = props.nodeId;

  const self = getCtx(props).allNodes.get().get(nodeId) as FlatNode;
  if (self.tagName === "a") return false;

  const parentIsButton = getCtx(props).getParentNodeByTagNames(nodeId, ["a"]);
  if (parentIsButton?.length > 0) return false;

  if (forbiddenEditTags.has(props.tagName)) return false;
  return true;
};

export function parseMarkdownToNodes(html: string, parentId: string): FlatNode[] {
  // Generate a base timestamp for unique IDs
  let uniqueCounter = Date.now();

  // Clean input text - handle special characters and markdown-like syntax
  html = html
    .replace(/&nbsp;|\u00A0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<br>/g, "");

  // Handle wiki-style [[link]] - add a unique placeholder href
  html = html.replace(/\[\[([^\]]+?)\]\]/g, (_, content) => {
    return `<a href="#placeholder-${uniqueCounter++}">${content}</a>`;
  });

  // Handle markdown-style [text](url) links
  html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, text, url) => {
    return `<a href="${url}">${text}</a>`;
  });

  // Handle other markdown formatting - avoid processing inside existing tags
  html = html
    .replace(/(?<!<a[^>]*?>[^<]*)\*\*(.+?)\*\*(?![^<]*?<\/a>)/g, "<strong>$1</strong>")
    .replace(/(?<!<a[^>]*?>[^<]*)\*(.+?)\*(?![^<]*?<\/a>)/g, "<em>$1</em>");

  // Use browser's DOM parser instead of character-by-character parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");

  // Process the DOM tree
  return extractNodesFromDOM(doc.body.firstElementChild as HTMLElement, parentId);
}

function extractNodesFromDOM(element: HTMLElement, parentId: string): FlatNode[] {
  const result: FlatNode[] = [];

  // Process each child node
  Array.from(element.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      // Handle text nodes - preserve text content but strip zero-width spaces
      let text = child.textContent;

      // Only skip if null or undefined, but keep empty strings and whitespace
      if (text !== null && text !== undefined) {
        // Remove zero-width spaces from beginning and end
        text = text.replace(/^\u200B+|\u200B+$/g, "");

        result.push({
          id: ulid(),
          parentId,
          nodeType: "TagElement",
          tagName: "text",
          copy: text,
        } as FlatNode);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const elem = child as HTMLElement;
      const tagName = elem.tagName.toLowerCase();

      // Skip any remaining space marker spans
      if (
        tagName === "span" &&
        (elem.classList.contains("space-marker") ||
          elem.getAttribute("style")?.includes("font-size: 0px"))
      ) {
        return;
      }

      // Create node for this element
      const nodeId = ulid();
      const node: FlatNode = {
        id: nodeId,
        parentId,
        nodeType: "TagElement",
        tagName,
      };

      // Handle special attributes for different tags
      if (tagName === "a") {
        // Process anchor tags
        node.href = (elem as HTMLAnchorElement).getAttribute("href") || undefined;

        // Save classes for the link
        const className = elem.getAttribute("class");
        if (className) {
          node.elementCss = className;
        }

        // Update attribute name for editable links
        if (elem.hasAttribute("data-space-protected") || elem.hasAttribute("data-editable-link")) {
          (node as any)["data-editable-link"] = "true";
        }
      } else if (tagName === "button") {
        // Process button tags - preserve all attributes
        const className = elem.getAttribute("class");
        if (className) {
          node.elementCss = className;
        }

        // Update attribute name for editable buttons
        if (
          elem.hasAttribute("data-space-protected") ||
          elem.hasAttribute("data-editable-button")
        ) {
          (node as any)["data-editable-button"] = "true";
        }

        // Copy all data attributes
        Array.from(elem.attributes).forEach((attr) => {
          if (
            attr.name.startsWith("data-") &&
            attr.name !== "data-space-protected" &&
            attr.name !== "data-editable-button"
          ) {
            (node as any)[attr.name] = attr.value;
          }
        });
      } else if (tagName === "img") {
        // Process image tags
        node.src = (elem as HTMLImageElement).getAttribute("src") || undefined;
        node.alt = (elem as HTMLImageElement).getAttribute("alt") || undefined;
      }

      // Add this node
      result.push(node);

      // Process children recursively with the new nodeId as parent
      const childNodes = extractNodesFromDOM(elem, nodeId);
      result.push(...childNodes);
    }
  });

  return result;
}

export function findLinkDestinationInHtml(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const linkElement = doc.querySelector("a");
  return linkElement ? linkElement.getAttribute("href") : null;
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

/**
 * Processes HTML content into a flat node structure, preserving formatting and interactive elements.
 * @param html The raw HTML string to process
 * @param parentId The parent node's ID
 * @param originalNodes Optional array of original nodes to match interactive elements against
 * @param onInsertSignal Optional callback to signal insertion of new interactive elements
 * @returns Array of parsed FlatNode objects
 */
export function processRichTextToNodes(
  html: string,
  parentId: string,
  originalNodes: FlatNode[] = [],
  onInsertSignal?: (tagName: string, nodeId: string) => void
): FlatNode[] {
  const parsedNodes = parseMarkdownToNodes(html, parentId);

  if (parsedNodes.length === 0) return [];

  // Process each node to restore interactive element properties
  parsedNodes.forEach((node) => {
    if (["a", "button"].includes(node.tagName)) {
      const matchingOriginalNode = findMatchingNode(node, originalNodes);

      if (matchingOriginalNode) {
        // Preserve properties from the original node
        node.buttonPayload = matchingOriginalNode.buttonPayload;
        if (node.tagName === "a" && matchingOriginalNode.href) {
          node.href = matchingOriginalNode.href;
        }
      } else if (onInsertSignal) {
        // New interactive element detected, trigger insert signal
        onInsertSignal(node.tagName, node.id);
      }
    }
  });

  return parsedNodes;
}

/**
 * Finds a matching node from a list of original nodes based on tag-specific criteria.
 * @param newNode The newly parsed node to match
 * @param originalNodes Array of original nodes to search through
 * @returns Matching FlatNode or undefined if no match found
 */
export function findMatchingNode(
  newNode: FlatNode,
  originalNodes: FlatNode[]
): FlatNode | undefined {
  if (newNode.tagName === "a" && newNode.href) {
    // Exact href match for links
    const hrefMatch = originalNodes.find(
      (node) => node.tagName === "a" && node.href === newNode.href
    );
    if (hrefMatch) return hrefMatch;

    // Domain-based partial match
    const partialMatch = originalNodes.find((node) => {
      if (node.tagName !== "a" || !node.href || !newNode.href) return false;
      try {
        const origDomain = new URL(node.href).hostname;
        const newDomain = new URL(newNode.href).hostname;
        return origDomain === newDomain;
      } catch {
        return false;
      }
    });
    if (partialMatch) return partialMatch;
  }

  if (newNode.tagName === "button") {
    const newText = getNodeText(newNode);
    const buttonMatches = originalNodes.filter((node) => node.tagName === "button");

    for (const button of buttonMatches) {
      const buttonText = getNodeText(button);
      if (
        buttonText.includes(newText) ||
        newText.includes(buttonText) ||
        calculateSimilarity(buttonText, newText) > 0.7
      ) {
        return button;
      }
    }

    if (
      buttonMatches.length === 1 &&
      originalNodes.filter((n) => n.tagName === "button").length === 1
    ) {
      return buttonMatches[0];
    }
  }

  return undefined;
}

/**
 * Retrieves the text content of a node, recursively including child nodes.
 * @param node The node to extract text from
 * @param ctx Optional NodesContext for accessing child nodes
 * @returns The combined text content
 */
export function getNodeText(node: FlatNode, ctx?: NodesContext): string {
  const context = ctx || getCtx();
  if (node.copy) return node.copy;

  const childIds = context.getChildNodeIDs(node.id);
  if (childIds.length === 0) return "";

  return childIds
    .map((id) => {
      const childNode = context.allNodes.get().get(id) as FlatNode;
      return childNode ? getNodeText(childNode, context) : "";
    })
    .join(" ")
    .trim();
}

/**
 * Calculates the similarity between two strings (0 to 1, where 1 is identical).
 * @param a First string
 * @param b Second string
 * @returns Similarity score
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const aChars = new Set(a.toLowerCase());
  const bChars = new Set(b.toLowerCase());
  const intersection = new Set([...aChars].filter((x) => bChars.has(x)));
  const union = new Set([...aChars, ...bChars]);

  return intersection.size / union.size;
}
