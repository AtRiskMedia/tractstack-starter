import type { NodesContext } from "@/store/nodes.ts";
import type { FlatNode, MarkdownNode } from "@/types.ts";

export const markdownFragmentToMarkdown = (nodeId: string, ctx: NodesContext) : string => {
  const node = ctx.allNodes.get().get(nodeId) as MarkdownNode;
  if(!node || node.nodeType !== "Markdown") return "";

  // Process children
  const childrenMarkdown = (ctx.getChildNodeIDs(nodeId) || [])
    .map((child) => flatNodeToMarkdown(child, ctx))
    .join('');

  return childrenMarkdown;
}

export const flatNodeToMarkdown = (nodeId: string, ctx: NodesContext): string => {
  const node = ctx.allNodes.get().get(nodeId);
  if(!node) return "";

  // Process children first
  const childrenMarkdown = (ctx.getChildNodeIDs(nodeId) || [])
    .map((child) => flatNodeToMarkdown(child, ctx))
    .join('');

  // Convert the node to Markdown based on typeName
  let type: string = node.nodeType as string;
  if("tagName" in node) {
    type = node.tagName as string;
  }

  switch (type) {
    case 'h2':
      return `## ${childrenMarkdown}\n\n`;
    case 'h3':
      return `### ${childrenMarkdown}\n\n`;
    case 'h4':
      return `#### ${childrenMarkdown}\n\n`;
    case 'p':
      return `${childrenMarkdown}\n\n`;
    case 'em':
      return `*${childrenMarkdown}*`;
    case 'strong':
      return `**${childrenMarkdown}**`;
    case 'text':
      return (node as FlatNode)?.copy || ''; // Return the actual text content
    default:
      return childrenMarkdown; // Default case for unhandled typeNames
  }
};