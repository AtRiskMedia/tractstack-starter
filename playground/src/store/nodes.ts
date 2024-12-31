import { atom } from "nanostores";
import type {
  BaseNode,
  FlatNode,
  ImpressionNode,
  MarkdownPaneFragmentNode,
  MenuNode,
  NodeType,
  PaneFragmentNode,
  PaneNode,
  StoryFragmentNode,
  StoryKeepAllNodes,
  TemplateMarkdown,
  TemplateNode,
  TemplatePane,
  TractStackNode,
  ViewportKey,
} from "@/types.ts";
import type { CSSProperties } from "react";
import { processClassesForViewports } from "@/utils/compositor/reduceNodesClassNames.ts";
import type { BeliefDatum } from "../types.ts";
import { ulid } from "ulid";
import { NotificationSystem } from "@/store/notificationSystem.ts";

export const ROOT_NODE_NAME = "root";
export const notifications = new NotificationSystem<BaseNode>();

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
  notifications.clear();
};

export const buildNodesTreeFromFragmentNodes = (nodes: StoryKeepAllNodes | null) => {
  if (nodes !== null) {
    clearAll();
    addNodes(nodes.fileNodes);
    addNodes(nodes.menuNodes);
    addNodes(nodes.resourceNodes);
    addNodes(nodes.tractstackNodes);
    // IMPORTANT!
    // pane nodes have to be added BEFORE StoryFragment nodes so they can register in allNodes
    addNodes(nodes.paneNodes);
    // then storyfragment nodes will link pane nodes from above
    addNodes(nodes.storyfragmentNodes);
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

export const getNodeStringStyles = (nodeId: string, viewport: ViewportKey): string => {
  const node = allNodes.get().get(nodeId);
  return getStringNodeStyles(node, viewport);
}

export const getNodeCSSPropertiesStyles = (nodeId: string, viewport: ViewportKey): CSSProperties => {
  const node = allNodes.get().get(nodeId);
  return getReactNodeStyles(node, viewport);
}

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

const notifyNode = (nodeId: string, payload?: BaseNode) => {
  let notifyNodeId = nodeId;
  if (notifyNodeId === rootNodeId.get()) {
    notifyNodeId = ROOT_NODE_NAME;
  }
  notifications.notify(notifyNodeId, payload);
};

export const addTemplatePane = (
  ownerId: string,
  pane: TemplatePane,
  insertPaneId?: string,
  location?: "before" | "after"
) => {
  const ownerNode = allNodes.get().get(ownerId);
  if (
    ownerNode?.nodeType !== "StoryFragment" &&
    ownerNode?.nodeType !== "Root" &&
    ownerNode?.nodeType !== "File" &&
    ownerNode?.nodeType !== "TractStack"
  ) {
    return;
  }
  const duplicatedPane = { ...pane } as TemplatePane;
  const duplicatedPaneId = ulid();
  duplicatedPane.id = duplicatedPaneId;
  duplicatedPane.parentId = ownerNode.id;

  duplicatedPane.markdown = { ...pane.markdown } as TemplateMarkdown;
  duplicatedPane.markdown.id = ulid();
  duplicatedPane.markdown.parentId = duplicatedPaneId;
  const markdownNodes: TemplateNode[] = [];
  // add self
  duplicatedPane.markdown.nodes?.forEach((node) => {
    // retrieve flattened children nodes
    const childrenNodes = setupTemplateNodeRecursively(node, duplicatedPane.markdown.id);
    // flatten children nodes so they're the same level as our pane
    childrenNodes.forEach((childrenNode) => markdownNodes.push(childrenNode));
  });

  // add pane but manually as addNodes will skip pane addition due to storyfragments rule
  addNode(duplicatedPane as PaneNode);
  linkChildToParent(duplicatedPane.id, duplicatedPane.parentId);

  // add markdown now since pane already exists
  addNode(duplicatedPane.markdown as MarkdownPaneFragmentNode);

  // add the result of the markdown nodes
  addNodes(markdownNodes);
  notifyNode(ownerId);
};

export const addTemplateNode = (
  markdownId: string,
  node: TemplateNode,
  insertNodeId?: string,
  location?: "before" | "after"
) => {
  const markdownNode = allNodes.get().get(markdownId) as MarkdownPaneFragmentNode;
  if (!markdownNode || markdownNode.nodeType !== "Markdown") {
    return;
  }

  const duplicatedNodes = { ...node } as TemplateNode;
  duplicatedNodes.id = ulid();
  duplicatedNodes.parentId = markdownNode.id;
  const flattenedNodes = setupTemplateNodeRecursively(duplicatedNodes, markdownNode.id);
  // register flattened nodes to all nodes and set up relationship with its parent
  addNodes(flattenedNodes);

  const markdownNodes = parentNodes.get().get(markdownId);
  // now grab parent nodes, check if we have inner node
  if (insertNodeId && markdownNodes && markdownNodes?.indexOf(insertNodeId) !== -1) {
    const newNode = markdownNodes.splice(markdownNodes.indexOf(duplicatedNodes.id, 1));
    if (location === "before") {
      markdownNodes.insertBefore(markdownNodes.indexOf(insertNodeId), newNode);
    } else {
      markdownNodes.insertAfter(markdownNodes.indexOf(insertNodeId), newNode);
    }
  }
  notifyNode(markdownId);
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
  deleteNodesRecursively(node);
  // if this was a pane node then we need to update storyfragment as it tracks panes
  if (parentId !== null) {
    notifyNode(parentId);

    if (node.nodeType === "Pane") {
      const storyFragment = allNodes.get().get(parentId) as StoryFragmentNode;
      if (storyFragment) {
        storyFragment.paneIds.splice(storyFragment.paneIds.indexOf(nodeId), 1);
      }
    }
  } else {
    // we deleted the node without a parent, send a notification to the root and let storykeep handle it
    // it might be safe to refresh the whole page
    if (nodeId === rootNodeId.get()) {
      // if we actually deleted the root then clear it up
      rootNodeId.set("");
    }
    notifyNode(ROOT_NODE_NAME);
  }
};

const deleteNodesRecursively = (node: BaseNode | undefined) => {
  if (!node) return;

  getChildNodeIDs(node.id).forEach((id) => {
    deleteNodesRecursively(allNodes.get().get(id));
  });
  // remove node
  allNodes.get().delete(node.id);

  // remove parent link too
  if (node.parentId !== null) {
    const parentNode = parentNodes.get().get(node.parentId);
    if (parentNode) {
      parentNode.splice(parentNode.indexOf(node.id), 1);
    }
  }
};
