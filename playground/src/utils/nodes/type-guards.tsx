import type { BaseNode, PaneFragmentNode, MarkdownPaneFragmentNode } from "../../types";

export const isMarkdownPaneFragmentNode = (
  node: BaseNode | PaneFragmentNode | null
): node is MarkdownPaneFragmentNode => {
  return (
    node !== null && node.nodeType === "Markdown" && "type" in node && node.type === "markdown"
  );
};
