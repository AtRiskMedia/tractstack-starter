import type { NodesContext } from "@/store/nodes.ts";
import type { FlatNode, MarkdownPaneFragmentNode } from "@/types.ts";
import { ulid } from "ulid";

export const hasWidgetChildren = (nodeId: string, ctx: NodesContext): boolean => {
  const node = ctx.allNodes.get().get(nodeId) as FlatNode;
  if (!node) return false;

  let hasWidgets = "tagName" in node && node?.tagName === "code";
  ctx.getChildNodeIDs(nodeId).forEach((childNodeId) => {
    const hasAny = hasWidgetChildren(childNodeId, ctx);
    if (hasAny) {
      hasWidgets = hasAny;
    }
  });
  return hasWidgets;
};

export const hasImgChildren = (nodeId: string, ctx: NodesContext): boolean => {
  const node = ctx.allNodes.get().get(nodeId) as FlatNode;
  if (!node) return false;

  let hasImgs = "tagName" in node && node?.tagName === "img";
  ctx.getChildNodeIDs(nodeId).forEach((childNodeId) => {
    const hasAny = hasImgChildren(childNodeId, ctx);
    if (hasAny) {
      hasImgs = hasAny;
    }
  });
  return hasImgs;
};

export class MarkdownGenerator {
  protected _ctx: NodesContext;
  protected _listIdx: number = 0;

  constructor(ctx: NodesContext) {
    this._ctx = ctx;
  }

  reset() {
    this._listIdx = 0;
  }

  markdownFragmentToMarkdown(nodeId: string): string {
    const node = this._ctx.allNodes.get().get(nodeId) as MarkdownPaneFragmentNode;
    if (!node || node.nodeType !== "Markdown") return "";

    // Process children
    const childrenMarkdown = (this._ctx.getChildNodeIDs(nodeId) || [])
      .map((child) => this.flatNodeToMarkdown(child))
      .join("");

    return childrenMarkdown;
  }

  flatNodeToMarkdown(nodeId: string): string {
    const node = this._ctx.allNodes.get().get(nodeId);
    if (!node) return "";

    const children = this._ctx.getChildNodeIDs(nodeId);
    // Process children first
    const childrenMarkdown = (children || [])
      .map((child) => this.flatNodeToMarkdown(child))
      .join("");

    // Convert the node to Markdown based on typeName
    let type: string = node.nodeType as string;
    if ("tagName" in node) {
      type = node.tagName as string;
    }

    switch (type) {
      case "h2":
        return `## ${childrenMarkdown}\n\n`;
      case "h3":
        return `### ${childrenMarkdown}\n\n`;
      case "h4":
        return `#### ${childrenMarkdown}\n\n`;
      case "p":
        return `${childrenMarkdown}\n\n`;
      case "em":
        return ` *${childrenMarkdown}* `;
      case "strong":
        return `**${childrenMarkdown}**`;
      case "a":
        return `[${childrenMarkdown}](${(node as FlatNode)?.href})`;
      case "code":
        return `* \`${(node as FlatNode)?.copy || ""}\`\n`;
      case "text":
        return (node as FlatNode)?.copy || ""; // Return the actual text content
      case "ul":
      case "ol":
        this._listIdx = 0;
        return childrenMarkdown;
      case "img":
        return `* ![${(node as FlatNode)?.alt}](${(node as FlatNode)?.fileId})\n\n`;
      case "li": {
        if (hasWidgetChildren(nodeId, this._ctx) || hasImgChildren(nodeId, this._ctx)) {
          return childrenMarkdown;
        }
        this._listIdx++;
        const listStr = `${this._listIdx}. ${childrenMarkdown}\n`;
        return listStr;
      }
      default:
        return childrenMarkdown; // Default case for unhandled typeNames
    }
  }

  markdownToFlatNodes(markdown: string, parentId: string): FlatNode[] {
    const nodes: FlatNode[] = [];
    let currentList: { type: "ol" | "ul"; nodeId: string } | null = null;

    const createTextNode = (text: string, parentId: string): FlatNode => {
      const textNodeId = ulid();
      const textNode: FlatNode = {
        id: textNodeId,
        tagName: "text",
        copy: text,
        nodeType: "TagElement",
        parentId,
      };
      nodes.push(textNode);
      return textNode;
    };

    const createNode = (
      tagName: string,
      parentId: string,
      additionalProps: Partial<FlatNode> = {}
    ): FlatNode => {
      const nodeId = ulid();
      const node: FlatNode = {
        id: nodeId,
        tagName,
        nodeType: "TagElement",
        parentId,
        ...additionalProps,
      };
      nodes.push(node);
      return node;
    };

    // Process markdown line by line
    const lines = markdown.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      let match;

      // Skip empty lines but handle markdown spacing
      if (!line) {
        i++;
        // Reset list context on double newline
        if (i < lines.length && !lines[i].trim()) {
          currentList = null;
          i++;
        }
        continue;
      }

      // Ordered list item with heading or paragraph
      if ((match = /^(\d+)\.\s+(#{1,6}\s+)?(.*)$/.exec(line))) {
        const [, , headingMarks, content] = match;

        // Create ordered list container if needed
        if (!currentList || currentList.type !== "ol") {
          const olNode = createNode("ol", parentId);
          currentList = { type: "ol", nodeId: olNode.id };
        }

        // Create list item with appropriate custom tag
        const isHeading = headingMarks?.trim();
        const tagNameCustom = isHeading ? `h${headingMarks.trim().length}` : "p";
        const liNode = createNode("li", currentList.nodeId, { tagNameCustom });
        createTextNode(content, liNode.id);

        i++;
        continue;
      }

      // Unordered list item with image
      if ((match = /^\* !\[(.*?)\]\((.*?)\)$/.exec(line))) {
        const [, alt, src] = match;

        // Create unordered list container if needed
        if (!currentList || currentList.type !== "ul") {
          const ulNode = createNode("ul", parentId);
          currentList = { type: "ul", nodeId: ulNode.id };
        }

        // Create list item and image
        const liNode = createNode("li", currentList.nodeId);
        createNode("img", liNode.id, { alt, src: src || "/static.jpg" });

        i++;
        continue;
      }

      // Regular unordered list item
      if ((match = /^\* (.*)$/.exec(line))) {
        const [, content] = match;

        // Create unordered list container if needed
        if (!currentList || currentList.type !== "ul") {
          const ulNode = createNode("ul", parentId);
          currentList = { type: "ul", nodeId: ulNode.id };
        }

        const liNode = createNode("li", currentList.nodeId);
        createTextNode(content, liNode.id);

        i++;
        continue;
      }

      // Regular heading
      if ((match = /^(#{1,6})\s+(.*)$/.exec(line))) {
        const [, level, content] = match;
        const headingNode = createNode(`h${level.length}`, parentId);
        createTextNode(content, headingNode.id);
        currentList = null;
        i++;
        continue;
      }

      // Links within text
      if (line.includes("[") && line.includes("]") && line.includes("(")) {
        const paragraphNode = createNode("p", parentId);
        const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
        let lastIndex = 0;
        let content = "";

        while ((match = linkRegex.exec(line)) !== null) {
          // Add text before link
          if (match.index > lastIndex) {
            content += line.substring(lastIndex, match.index);
          }

          const [, linkText, href] = match;
          const linkNode = createNode("a", paragraphNode.id, { href });
          createTextNode(linkText, linkNode.id);

          lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < line.length) {
          content += line.substring(lastIndex);
        }

        if (content) {
          createTextNode(content, paragraphNode.id);
        }

        currentList = null;
        i++;
        continue;
      }

      // Code blocks
      if ((match = /^```([a-z]*)\n([\s\S]*?)\n```$/.exec(line))) {
        const [, , code] = match;
        createNode("code", parentId, { copy: code });
        currentList = null;
        i++;
        continue;
      }

      // Default to paragraph
      const paragraphNode = createNode("p", parentId);
      createTextNode(line, paragraphNode.id);
      currentList = null;
      i++;
    }
    return nodes;
  }
}
