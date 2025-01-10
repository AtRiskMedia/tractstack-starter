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
        return `* ![${(node as FlatNode)?.alt}](${(node as FlatNode)?.src})\n\n`;
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

export function nodesToMarkdownText(nodes: FlatNode[]): string {
  // Build a map to organize children by parentId
  const nodeMap: Record<string, FlatNode[]> = {};
  nodes.forEach(node => {
    const parentId = node.parentId || "";
    if (!nodeMap[parentId]) {
      nodeMap[parentId] = [];
    }
    nodeMap[parentId].push(node);
  });

  // Helper function to recursively generate markdown
  function generateMarkdown(nodeId: string): string {
    const children = nodeMap[nodeId] || [];
    return children
      .map(node => {
        let content = '';

        // Handle copy text directly
        if (node.copy) {
          content = node.copy;
        }

        // Wrap content in appropriate markdown tags based on tagName
        switch (node.tagName) {
          case 'em':
            content = `*${generateMarkdown(node.id)}*`;
            break;
          case 'strong':
            content = `**${generateMarkdown(node.id)}**`;
            break;
          case 'text':
            content += generateMarkdown(node.id);
            break;
          default:
            content += generateMarkdown(node.id);
            break;
        }

        return content;
      })
      .join(' ');
  }

  // Start from the first node
  return generateMarkdown(nodes[0].id).trim();
}

export function markdownToNodes(markdown: string, parentId: string): FlatNode[] {
  let nodeIdCounter = 1;

  function createNode(tagName: string, copy: string | null, parentId: string): FlatNode {
    return {
      id: ulid(),
      nodeType: 'TagElement',
      parentId,
      tagName: tagName !== 'text' ? tagName : "text",
      copy: tagName === 'text' ? copy : undefined,
    } as FlatNode;
  }

  const nodes: FlatNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|([^*]+))/g;

  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    if (match[2]) {
      const strongNode = createNode('strong', null, parentId);
      nodes.push(strongNode);
      nodes.push(createNode('text', match[2], strongNode.id));
    } else if (match[3]) {
      const emNode = createNode('em', null, parentId);
      nodes.push(emNode);
      nodes.push(createNode('text', match[3], emNode.id));
    } else if (match[4] && match[4].trim()) {
      nodes.push(createNode('text', match[4].trim(), parentId));
    }
  }

  return nodes;
}