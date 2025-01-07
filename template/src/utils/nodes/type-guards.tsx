import type {
  BaseNode,
  PaneNode,
  PaneFragmentNode,
  MarkdownPaneFragmentNode,
  FlatNode,
} from "../../types";

interface BreakData {
  collection: string;
  image: string;
  svgFill: string;
}

interface BreakNode extends FlatNode {
  breakDesktop: BreakData;
  breakTablet: BreakData;
  breakMobile: BreakData;
}

export const isBreakNode = (node: FlatNode | null): node is BreakNode => {
  return node?.nodeType === "BgPane" && "breakDesktop" in node;
};

export const isPaneNode = (node: BaseNode | undefined): node is PaneNode => {
  return node?.nodeType === "Pane";
};

export const isMarkdownPaneFragmentNode = (
  node: BaseNode | PaneFragmentNode | null
): node is MarkdownPaneFragmentNode => {
  return (
    node !== null && node.nodeType === "Markdown" && "type" in node && node.type === "markdown"
  );
};

interface WidgetNode extends FlatNode {
  tagName: "code";
  codeHookParams: (string | string[])[];
  copy: string;
}

export const isWidgetNode = (node: BaseNode | FlatNode | null): node is WidgetNode => {
  return (
    node !== null &&
    "tagName" in node &&
    node.tagName === "code" &&
    "codeHookParams" in node &&
    Array.isArray(node.codeHookParams)
  );
};
