import type {
  BaseNode,
  PaneNode,
  LinkNode,
  StoryFragmentNode,
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

export const isCodeHookPaneNode = (node: BaseNode | undefined): node is PaneNode => {
  return node?.nodeType === "Pane" && `codeHookTarget` in node;
};

export const isContextPaneNode = (
  node: BaseNode | undefined
): node is PaneNode & { isContextPane: boolean } => {
  return Boolean(
    node?.nodeType === "Pane" &&
      "isContextPane" in node &&
      typeof node.isContextPane === "boolean" &&
      node.isContextPane
  );
};

export const isStoryFragmentNode = (node: BaseNode | null): node is StoryFragmentNode => {
  return node?.nodeType === "StoryFragment";
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

export function hasTagName(node: BaseNode | null | undefined): node is FlatNode {
  return node !== null && node !== undefined && "tagName" in node;
}

export function isDefined<T>(node: T | null | undefined): node is T {
  return node !== null && node !== undefined;
}

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

export function toTag(str: string): Tag | null {
  return isValidTag(str) ? str : null;
}

export function hasSpecificTag(node: BaseNode | null | undefined, tag: Tag): node is FlatNode {
  return hasTagName(node) && node.tagName === tag;
}

export const isLinkNode = (node: BaseNode | FlatNode | null): node is LinkNode => {
  return node !== null && "tagName" in node && (node.tagName === "a" || node.tagName === "button");
};

export function hasButtonPayload(node: BaseNode): node is LinkNode {
  return (
    "tagName" in node &&
    (node.tagName === "a" || node.tagName === "button") &&
    "buttonPayload" in node &&
    node.buttonPayload !== undefined
  );
}

export const hasBeliefPayload = (node: BaseNode): boolean =>
  ("heldBeliefs" in node && Object.keys(node.heldBeliefs || {}).length > 0) ||
  ("withheldBeliefs" in node && Object.keys(node.withheldBeliefs || {}).length > 0);

export const getType = (node: BaseNode | FlatNode): string => {
  let type = node.nodeType as string;
  if ("tagName" in node) {
    type = node.tagName;
  }
  return type;
};
