import type {
  BaseNode,
  PaneNode,
  PaneFragmentNode,
  MarkdownPaneFragmentNode,
  FlatNode,
  Tag,
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

// Type guard to check if a node has a tagName property
export function hasTagName(node: BaseNode | null | undefined): node is FlatNode {
  return node !== null && node !== undefined && "tagName" in node;
}

// Type guard for checking if a node is defined
export function isDefined<T>(node: T | null | undefined): node is T {
  return node !== null && node !== undefined;
}

// Helper function to ensure string is a valid Tag
export function isValidTag(tagName: string): tagName is Tag {
  const validTags: Tag[] = [
    "modal",
    "parent",
    "p",
    "h2",
    "h3",
    "h4",
    "img",
    "li",
    "ol",
    "ul",
    "signup",
    "yt",
    "bunny",
    "belief",
    "identify",
    "toggle",
    "code",
  ];
  return validTags.includes(tagName as Tag);
}

// Helper function to convert string to Tag (with runtime validation)
export function toTag(str: string): Tag | null {
  return isValidTag(str) ? str : null;
}

// Type guard for node with specific tag
export function hasSpecificTag(node: BaseNode | null | undefined, tag: Tag): node is FlatNode {
  return hasTagName(node) && node.tagName === tag;
}
