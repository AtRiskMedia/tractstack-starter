import { atom } from "nanostores";
import type {
  BaseNode,
  FlatNode,
  MarkdownPaneFragmentNode,
  NodeType,
  PaneFragmentNode,
  PaneNode,
  StoryFragmentNode,
  StoryKeepAllNodes,
  ViewportKey,
  ImpressionNode,
  TractStackNode,
  MenuNode,
  TemplateNode,
  TemplatePane,
} from "@/types.ts";
import type { CSSProperties } from "react";
import { processClassesForViewports } from "@/utils/compositor/reduceNodesClassNames.ts";
import type { BeliefDatum } from "../types.ts";
import { ulid } from "ulid";

export const allNodes = atom<Map<string, BaseNode>>(new Map<string, BaseNode>());
export const impressionNodes = atom<Set<ImpressionNode>>(new Set<ImpressionNode>());
export const parentNodes = atom<Map<string, string[]>>(new Map<string, string[]>());
export const rootNodeId = atom<string>("");
export const clickedNodeId = atom<string>("");

export const getChildNodeIDs = (parentNodeId: string): string[] => {
  const returnVal = parentNodes.get()?.get(parentNodeId) || [];
  return returnVal;
};

const blockedClickNodes = new Set<string>(["em", "strong"]);

export const setClickedNodeId = (nodeId: string) => {
  let node = allNodes.get().get(nodeId) as FlatNode;
  if (node && "tagName" in node) {
    // make sure the element we clicked is an actual block element, not a decorator
    while (node.parentId !== null && blockedClickNodes.has(node.tagName)) {
      // if not then look for closest suitable element
      node = allNodes.get().get(node.parentId) as FlatNode;
    }
    // only decorators? Tree broken, don't allow any clicks
    if (!node) {
      console.error("Cannot find any available element to click, abort");
      return;
    }
  }
  clickedNodeId.set(node.id);
  console.log("clickedNodeId: ", node.id);
};

export const clearAll = () => {
  allNodes.get().clear();
  parentNodes.get().clear();
  impressionNodes.get().clear();
  rootNodeId.set("");
};

export const buildNodesTreeFromFragmentNodes = (nodes: StoryKeepAllNodes | null) => {
  if (nodes !== null) {
    clearAll();
    addNodes(nodes.fileNodes);
    addNodes(nodes.menuNodes);
    addNodes(nodes.resourceNodes);
    addNodes(nodes.tractstackNodes);
    addNodes(nodes.storyfragmentNodes);
    addNodes(nodes.paneNodes);
    addNodes(nodes.impressionNodes);
    addNodes(nodes.paneFragmentNodes);
    addNodes(nodes.flatNodes);
  }
};

function linkChildToParent(nodeId: string, parentId: string) {
  const parentNode = parentNodes.get();
  if (parentNode.has(parentId)) {
    parentNode.get(parentId)?.push(nodeId);
    parentNodes.set(new Map<string, string[]>(parentNode));
  } else {
    parentNode.set(parentId, [nodeId]);
  }
}

export const addNode = (data: BaseNode) => {
  allNodes.get().set(data.id, data);

  // root node
  if (data.parentId === null && rootNodeId.get().length === 0) {
    rootNodeId.set(data.id);
    return;
  }
  const parentNode = parentNodes.get();
  if (!parentNode) return;

  if (data.parentId !== null) {
    // if storyfragment then iterate over its paneIDs
    if (data.nodeType === "StoryFragment") {
      const storyFragment = data as StoryFragmentNode;
      linkChildToParent(data.id, data.parentId);

      storyFragment.paneIds.forEach((paneId: string) => {
        // pane should already exist by now, tell it where it belongs to
        const pane = allNodes.get().get(paneId);
        if (pane) {
          pane.parentId = data.id;
        }
        linkChildToParent(paneId, data.id);
      });
      // skip panes, they get linked along with story fragment
    } else if (data.nodeType !== "Pane") {
      linkChildToParent(data.id, data.parentId);

      if (data.nodeType === "Impression") {
        impressionNodes.get().add(data as ImpressionNode);
      }
    }
  }
};

export const addNodes = (nodes: BaseNode[]) => {
  for (const node of nodes) {
    addNode(node);
  }
};

const getClosestNodeTypeFromId = (startNodeId: string, nodeType: NodeType): string => {
  const node = allNodes.get().get(startNodeId);
  if (!node || node.nodeType === "Root") return "";

  const parentId = node.parentId || "";
  const parentNode = allNodes.get().get(parentId);
  if (parentNode && parentNode.nodeType === nodeType) {
    return parentId;
  } else {
    return getClosestNodeTypeFromId(parentId, nodeType);
  }
};

export const getStyleByViewport = (
  defaultClasses:
    | {
        mobile?: Record<string, string> | undefined;
        tablet?: Record<string, string> | undefined;
        desktop?: Record<string, string> | undefined;
      }
    | undefined,
  viewport: ViewportKey
): Record<string, string> => {
  switch (viewport) {
    case "desktop":
      return defaultClasses?.desktop || {};
    case "tablet":
      return defaultClasses?.tablet || {};
    default:
    case "mobile":
      return defaultClasses?.mobile || {};
  }
};

export const getNodeSlug = (nodeId: string): string => {
  const node = allNodes.get().get(nodeId);
  if (!node || !(`slug` in node) || typeof node.slug !== `string`) return "";
  return node.slug;
};

export const getMenuNodeById = (id: string): MenuNode | null => {
  const node = allNodes.get().get(id);
  return node?.nodeType === "Menu" ? (node as MenuNode) : null;
};

export const getTractStackNodeById = (id: string): TractStackNode | null => {
  const node = allNodes.get().get(id);
  return node?.nodeType === "TractStack" ? (node as TractStackNode) : null;
};

export const getStoryFragmentNodeBySlug = (slug: string): StoryFragmentNode | null => {
  const nodes = Array.from(allNodes.get().values());
  return (
    nodes.find(
      (node): node is StoryFragmentNode =>
        node.nodeType === "StoryFragment" && "slug" in node && node.slug === slug
    ) || null
  );
};

export const getContextPaneNodeBySlug = (slug: string): PaneNode | null => {
  const nodes = Array.from(allNodes.get().values());
  return (
    nodes.find(
      (node): node is PaneNode =>
        node.nodeType === "Pane" &&
        "slug" in node &&
        node.slug === slug &&
        "isContextPane" in node &&
        node.isContextPane === true
    ) || null
  );
};

export const getImpressionNodesForPanes = (paneIds: string[]): ImpressionNode[] => {
  const nodes = Array.from(impressionNodes.get().values());
  return nodes.filter(
    (node): node is ImpressionNode =>
      node.nodeType === "Impression" &&
      typeof node.parentId === `string` &&
      paneIds.includes(node.parentId)
  );
};

export const getNodeCodeHookPayload = (
  nodeId: string
): { target: string; params?: Record<string, string> } | null => {
  const node = allNodes.get().get(nodeId);
  const target = node && "codeHookTarget" in node ? (node.codeHookTarget as string) : undefined;
  const payload =
    node && "codeHookPayload" in node
      ? (node.codeHookPayload as Record<string, string>)
      : undefined;

  if (target) {
    return {
      target: target,
      ...(payload && { params: payload }),
    };
  }
  return null;
};

export const getPaneBeliefs = (
  nodeId: string
): { heldBeliefs: BeliefDatum; withheldBeliefs: BeliefDatum } | null => {
  const paneNode = allNodes.get().get(nodeId) as PaneNode;
  if (paneNode.nodeType !== "Pane") {
    return null;
  }

  const beliefs: { heldBeliefs: BeliefDatum; withheldBeliefs: BeliefDatum } = {
    heldBeliefs: {},
    withheldBeliefs: {},
  };
  let anyBeliefs = false;
  if ("heldBeliefs" in paneNode) {
    beliefs.heldBeliefs = paneNode.heldBeliefs as BeliefDatum;
    anyBeliefs = true;
  }
  if ("withheldBeliefs" in paneNode) {
    beliefs.withheldBeliefs = paneNode.withheldBeliefs as BeliefDatum;
    anyBeliefs = true;
  }

  return anyBeliefs ? beliefs : null;
};

export const getNodeClasses = (
  nodeId: string,
  viewport: ViewportKey,
  depth: number = 0
): string => {
  const node = allNodes.get().get(nodeId);
  if (!node) return "";

  switch (node.nodeType) {
    case "Markdown":
      {
        const markdownFragment = node as MarkdownPaneFragmentNode;
        if ("parentCss" in markdownFragment) {
          return (<string[]>markdownFragment.parentCss)[depth];
        }
      }
      break;

    case "TagElement":
      {
        if (
          node &&
          `tagName` in node &&
          typeof node.tagName === `string` &&
          [`button`, `a`].includes(node.tagName)
        ) {
          if (`elementCss` in node && typeof node.elementCss === `string`) return node.elementCss;
          return ``;
        }
        const closestPaneId = getClosestNodeTypeFromId(nodeId, "Markdown");
        const paneNode = allNodes.get().get(closestPaneId) as MarkdownPaneFragmentNode;
        if (paneNode && "tagName" in node) {
          const tagNameStr = node.tagName as string;
          const styles = paneNode.defaultClasses![tagNameStr];
          // todo make a copy if this works
          if (styles && styles.mobile) {
            const [all /*, mobile, tablet, desktop */] = processClassesForViewports(
              styles,
              (node as FlatNode)?.overrideClasses || {},
              1
            );
            return all[0];
            // switch (viewport) {
            //   case "desktop": return desktop[0];
            //   case "tablet": return tablet[0];
            //   case "mobile": return mobile[0];
            //   default: return mobile[0];
            // }
          }
        }
      }
      break;

    case "StoryFragment": {
      const storyFragment = node as StoryFragmentNode;
      return typeof storyFragment?.tailwindBgColour === `string`
        ? `bg-${storyFragment?.tailwindBgColour}`
        : ``;
    }
  }
  return "";
};

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
};

const getReactNodeStyles = (node: BaseNode | undefined, viewport: ViewportKey): CSSProperties => {
  if (!node) return {};

  switch (node?.nodeType) {
    case "Pane": {
      const pane = node as PaneFragmentNode;
      if ("bgColour" in pane) {
        return { backgroundColor: <string>pane.bgColour };
      }
    }
  }
  return {};
};

const getStringNodeStyles = (node: BaseNode | undefined, viewport: ViewportKey): string => {
  if (!node) return "";
  switch (node?.nodeType) {
    case "Pane": {
      const pane = node as PaneFragmentNode;
      if ("bgColour" in pane) {
        return `background-color: ${<string>pane.bgColour}`;
      }
    }
  }
  return "";
};

export const addPaneToStoryFragment = (
  nodeId: string,
  pane: PaneNode,
  location: "before" | "after"
) => {
  const node = allNodes.get().get(nodeId) as BaseNode;
  if (!node || (node.nodeType !== "StoryFragment" && node.nodeType !== "Pane")) {
    return;
  }

  pane.id = ulid();
  addNode(pane);

  if (node.nodeType === "Pane") {
    const storyFragmentId = getClosestNodeTypeFromId(nodeId, "StoryFragment");
    const storyFragment = allNodes.get().get(storyFragmentId) as StoryFragmentNode;
    if (storyFragment) {
      pane.parentId = storyFragmentId;
      const originalPaneIndex = storyFragment.paneIds.indexOf(pane.parentId);
      let insertIdx = -1;
      if (location === "before") insertIdx = Math.max(0, originalPaneIndex - 1);
      else insertIdx = Math.min(storyFragment.paneIds.length - 1, originalPaneIndex + 1);
      storyFragment.paneIds.splice(insertIdx, 0, pane.id);
    }
  } else if (node.nodeType !== "StoryFragment") {
    const storyFragment = node as StoryFragmentNode;
    if (storyFragment) {
      pane.parentId = node.id;
      if (location === "after") {
        storyFragment.paneIds.push(pane.id);
      } else {
        storyFragment.paneIds.unshift(pane.id);
      }
    }
  }
};

export const addTemplatePaneToStoryFragment = (
  nodeId: string,
  pane: TemplatePane,
  location: "before" | "after"
) => {};

export const addTemplateNode = (
  paneNodeId: string,
  node: TemplateNode,
  nodeId: string,
  location: "before" | "after"
) => {
  const paneNode = allNodes.get().get(paneNodeId) as PaneNode;
  if (!paneNode || paneNode.nodeType !== "Pane") {
    return;
  }

  const duplicatedNodes = { ...node } as TemplateNode;
  duplicatedNodes.id = ulid();
  duplicatedNodes.parentId = paneNode.id;
  const flattenedNodes = setupTemplateNodeRecursively(duplicatedNodes, duplicatedNodes.id);
  flattenedNodes.forEach((node) => delete node.nodes);

  addNodes(flattenedNodes);
};

const setupTemplateNodeRecursively = (node: TemplateNode, parentId: string) => {
  let result: TemplateNode[] = [];
  if (!node) return result;

  node.id = ulid();
  node.parentId = parentId;
  result.push(node);
  if ("nodes" in node && node.nodes) {
    for (let i = 0; i < node.nodes.length; ++i) {
      result = result.concat(setupTemplateNodeRecursively(node.nodes[i], node.id));
    }
  }
  return result;
};

export const deleteNode = (nodeId: string) => {
  const node = allNodes.get().get(nodeId) as BaseNode;
  if (!node) {
    return;
  }

  const parentId = node.parentId;
  deleteNodesRecursively(node.id);
  // if this was a pane node then we need to update storyfragment as it tracks panes
  if (node.nodeType === "Pane" && parentId !== null) {
    const storyFragment = allNodes.get().get(parentId) as StoryFragmentNode;
    if (storyFragment) {
      storyFragment.paneIds.splice(storyFragment.paneIds.indexOf(nodeId), 1);
    }
  }
};

const deleteNodesRecursively = (nodeId: string) => {
  getChildNodeIDs(nodeId).forEach((id) => {
    deleteNodesRecursively(id);
  });
  allNodes.get().delete(nodeId);
};
