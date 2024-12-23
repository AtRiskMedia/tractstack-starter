import { atom } from "nanostores";
import type {
  BaseNode,
  MarkdownPaneFragmentNode,
  PaneFragmentNode,
  PaneNode,
  StoryFragmentNode,
  ViewportKey,
} from "@/types.ts";
import type { CSSProperties } from "react";

export const allNodes = atom<Map<string, BaseNode>>(new Map<string, BaseNode>());
export const parentNodes = atom<Map<string, string[]>>(new Map<string, string[]>());
export const rootNodeId = atom<string>("");

export const getChildNodeIDs = (parentNodeId: string): string[] => {
  return Array.from(parentNodes.get()?.get(parentNodeId) || []);
}

export const clearAll = () => {
  allNodes.get().clear();
  parentNodes.get().clear();
  rootNodeId.set("");
}

export const addNode = (data: BaseNode) => {
  allNodes.get().set(data.id, data);

  // root node
  if(data.parentId === null && rootNodeId.get().length === 0) {
    rootNodeId.set(data.id);
  } else {
    const parentNode = parentNodes.get();
    if (data.parentId !== null && parentNode) {
      if (parentNode.has(data.parentId)) {
        parentNode.get(data.parentId)?.push(data.id);
        parentNodes.set(new Map<string, string[]>(parentNode));
      } else {
        parentNode.set(data.parentId, [data.id]);
      }
    }
  }
}

export const addNodes = (nodes: BaseNode[]) => {
  for (const node of nodes) {
    addNode(node);
  }
}

export const getNodeClasses = (nodeId: string, viewport: ViewportKey, depth: number = 0): string => {
  const node = allNodes.get().get(nodeId);
  if(!node) return "";

  switch (node.nodeType) {
    case "Markdown": {
      const markdownFragment = (node as MarkdownPaneFragmentNode);
      if("parentCss" in markdownFragment)
        return (<string[]>markdownFragment.parentCss)[depth];
    }
    break;

    case "StoryFragment": {
      const storyFragment = (node as StoryFragmentNode);
      return storyFragment.tailwindBgColour || "#000";
    }
    break;

  }
  return "";
}

export const getNodeStyles = <T extends CSSProperties | string>(
  nodeId: string,
  viewport: ViewportKey
): T => {
  const node = allNodes.get().get(nodeId);
  if (typeof ({} as T) === "string") {
    return getStringNodeStyles(node, viewport) as T;
  } else {
    return getReactNodeStyles(node, viewport) as T;
  }
}

const getReactNodeStyles = (node: BaseNode|undefined, viewport: ViewportKey): CSSProperties => {
  if(!node) return {};

  switch (node?.nodeType) {
    case "Pane": {
      const pane = node as PaneFragmentNode;
      if("bgColour" in pane) {
        return {backgroundColor: <string>pane.bgColour};
      }
    }
  }
  return {};
}

const getStringNodeStyles = (node: BaseNode|undefined, viewport: ViewportKey): string => {
  return "";
}