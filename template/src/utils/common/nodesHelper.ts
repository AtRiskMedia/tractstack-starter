import type { NodesContext } from "@/store/nodes.ts";
import type { FlatNode, MarkdownNode } from "@/types.ts";

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
    const node = this._ctx.allNodes.get().get(nodeId) as MarkdownNode;
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

    // Process children first
    const childrenMarkdown = (this._ctx.getChildNodeIDs(nodeId) || [])
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
      case "text":
        return (node as FlatNode)?.copy || ""; // Return the actual text content
      case "ul":
      case "ol":
        this._listIdx = 0;
        return childrenMarkdown;
      case "li": {
        this._listIdx++;
        const listStr = `${this._listIdx}. ${childrenMarkdown}\n`;
        return listStr;
      }
      default:
        return childrenMarkdown; // Default case for unhandled typeNames
    }
  }
}
