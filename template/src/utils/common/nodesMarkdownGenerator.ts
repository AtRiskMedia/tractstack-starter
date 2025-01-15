import type { NodesContext } from "@/store/nodes.ts";
import type { FlatNode, MarkdownPaneFragmentNode } from "@/types.ts";

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
}
