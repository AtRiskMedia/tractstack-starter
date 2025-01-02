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
import type { NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import type { ReactNodesRendererProps } from "@/components/storykeep/compositor-nodes/ReactNodesRenderer.tsx";
import type { WidgetProps } from "@/components/storykeep/compositor-nodes/nodes/Widget.tsx";
import { cloneDeep } from "@/utils/common/helpers.ts";

const blockedClickNodes = new Set<string>(["em", "strong"]);
export const ROOT_NODE_NAME = "root";

export class NodesContext {
  constructor() {}

  notifications = new NotificationSystem<BaseNode>();

  allNodes = atom<Map<string, BaseNode>>(new Map<string, BaseNode>());
  impressionNodes = atom<Set<ImpressionNode>>(new Set<ImpressionNode>());
  parentNodes = atom<Map<string, string[]>>(new Map<string, string[]>());
  rootNodeId = atom<string>("");
  clickedNodeId = atom<string>("");

  getChildNodeIDs(parentNodeId: string): string[] {
    const returnVal = this.parentNodes.get()?.get(parentNodeId) || [];
    return returnVal;
  }

  setClickedNodeId(nodeId: string) {
    let node = this.allNodes.get().get(nodeId) as FlatNode;
    if (node && "tagName" in node) {
      // make sure the element we clicked is an actual block element, not a decorator
      while (node.parentId !== null && blockedClickNodes.has(node.tagName)) {
        // if not then look for closest suitable element
        node = this.allNodes.get().get(node.parentId) as FlatNode;
      }
      // only decorators? Tree broken, don't allow any clicks
      if (!node) {
        console.error("Cannot find any available element to click, abort");
        return;
      }
    }
    this.clickedNodeId.set(node.id);
    console.log("this.clickedNodeId: ", node.id);
    console.log(node);
  }

  clearAll() {
    this.allNodes.get().clear();
    this.parentNodes.get().clear();
    this.impressionNodes.get().clear();
    this.rootNodeId.set("");
    this.notifications.clear();
  }

  buildNodesTreeFromFragmentNodes(nodes: StoryKeepAllNodes | null) {
    if (nodes !== null) {
      this.clearAll();
      this.addNodes(nodes.fileNodes);
      this.addNodes(nodes.menuNodes);
      this.addNodes(nodes.resourceNodes);
      this.addNodes(nodes.tractstackNodes);
      // IMPORTANT!
      // pane nodes have to be added BEFORE StoryFragment nodes so they can register in this.allNodes
      this.addNodes(nodes.paneNodes);
      // then storyfragment nodes will link pane nodes from above
      this.addNodes(nodes.storyfragmentNodes);
      this.addNodes(nodes.impressionNodes);
      this.addNodes(nodes.paneFragmentNodes);
      this.addNodes(nodes.flatNodes);
    }
  }

  linkChildToParent(nodeId: string, parentId: string) {
    const parentNode = this.parentNodes.get();
    if (parentNode.has(parentId)) {
      parentNode.get(parentId)?.push(nodeId);
      this.parentNodes.set(new Map<string, string[]>(parentNode));
    } else {
      parentNode.set(parentId, [nodeId]);
    }
  }

  addNode(data: BaseNode) {
    this.allNodes.get().set(data.id, data);

    // root node
    if (data.parentId === null && this.rootNodeId.get().length === 0) {
      this.rootNodeId.set(data.id);
      return;
    }
    const parentNode = this.parentNodes.get();
    if (!parentNode) return;

    if (data.parentId !== null) {
      // if storyfragment then iterate over its paneIDs
      if (data.nodeType === "StoryFragment") {
        const storyFragment = data as StoryFragmentNode;
        this.linkChildToParent(data.id, data.parentId);

        storyFragment.paneIds.forEach((paneId: string) => {
          // pane should already exist by now, tell it where it belongs to
          const pane = this.allNodes.get().get(paneId);
          if (pane) {
            pane.parentId = data.id;
          }
          this.linkChildToParent(paneId, data.id);
        });
        // skip panes, they get linked along with story fragment
      } else if (data.nodeType !== "Pane") {
        this.linkChildToParent(data.id, data.parentId);

        if (data.nodeType === "Impression") {
          this.impressionNodes.get().add(data as ImpressionNode);
        }
      }
    }
  }

  addNodes(nodes: BaseNode[]) {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  getClosestNodeTypeFromId(startNodeId: string, nodeType: NodeType): string {
    const node = this.allNodes.get().get(startNodeId);
    if (!node || node.nodeType === "Root") return "";

    const parentId = node.parentId || "";
    const parentNode = this.allNodes.get().get(parentId);
    if (parentNode && parentNode.nodeType === nodeType) {
      return parentId;
    } else {
      return this.getClosestNodeTypeFromId(parentId, nodeType);
    }
  }

  getStyleByViewport(
    defaultClasses:
      | {
          mobile?: Record<string, string> | undefined;
          tablet?: Record<string, string> | undefined;
          desktop?: Record<string, string> | undefined;
        }
      | undefined,
    viewport: ViewportKey
  ): Record<string, string> {
    switch (viewport) {
      case "desktop":
        return defaultClasses?.desktop || {};
      case "tablet":
        return defaultClasses?.tablet || {};
      default:
      case "mobile":
        return defaultClasses?.mobile || {};
    }
  }

  getNodeSlug(nodeId: string): string {
    const node = this.allNodes.get().get(nodeId);
    if (!node || !(`slug` in node) || typeof node.slug !== `string`) return "";
    return node.slug;
  }

  getMenuNodeById(id: string): MenuNode | null {
    const node = this.allNodes.get().get(id);
    return node?.nodeType === "Menu" ? (node as MenuNode) : null;
  }

  getTractStackNodeById(id: string): TractStackNode | null {
    const node = this.allNodes.get().get(id);
    return node?.nodeType === "TractStack" ? (node as TractStackNode) : null;
  }

  getStoryFragmentNodeBySlug(slug: string): StoryFragmentNode | null {
    const nodes = Array.from(this.allNodes.get().values());
    return (
      nodes.find(
        (node): node is StoryFragmentNode =>
          node.nodeType === "StoryFragment" && "slug" in node && node.slug === slug
      ) || null
    );
  }

  getContextPaneNodeBySlug(slug: string): PaneNode | null {
    const nodes = Array.from(this.allNodes.get().values());
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
  }

  getImpressionNodesForPanes(paneIds: string[]): ImpressionNode[] {
    const nodes = Array.from(this.impressionNodes.get().values());
    return nodes.filter(
      (node): node is ImpressionNode =>
        node.nodeType === "Impression" &&
        typeof node.parentId === `string` &&
        paneIds.includes(node.parentId)
    );
  }

  getNodeCodeHookPayload(
    nodeId: string
  ): { target: string; params?: Record<string, string> } | null {
    const node = this.allNodes.get().get(nodeId);
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
  }

  getPaneBeliefs(
    nodeId: string
  ): { heldBeliefs: BeliefDatum; withheldBeliefs: BeliefDatum } | null {
    const paneNode = this.allNodes.get().get(nodeId) as PaneNode;
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
  }

  getNodeClasses(nodeId: string, viewport: ViewportKey, depth: number = 0): string {
    const node = this.allNodes.get().get(nodeId);
    if (!node) return "";

    switch (node.nodeType) {
      case "Markdown":
        {
          const markdownFragment = node as MarkdownPaneFragmentNode;
          if (markdownFragment.parentClasses) {
            const [all, mobile, tablet, desktop] = processClassesForViewports(
              markdownFragment.parentClasses[depth],
              {}, // No override classes for Markdown parent case
              1
            );

            switch (viewport) {
              case "desktop":
                return desktop[0];
              case "tablet":
                return tablet[0];
              case "mobile":
                return mobile[0];
              default:
                return all[0];
            }
          }
          // Fallback to existing parentCss if needed
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
          const closestPaneId = this.getClosestNodeTypeFromId(nodeId, "Markdown");
          const paneNode = this.allNodes.get().get(closestPaneId) as MarkdownPaneFragmentNode;
          if (paneNode && "tagName" in node) {
            const tagNameStr = node.tagName as string;
            const styles = paneNode.defaultClasses![tagNameStr];
            if (styles && styles.mobile) {
              const [all, mobile, tablet, desktop] = processClassesForViewports(
                styles,
                (node as FlatNode)?.overrideClasses || {},
                1
              );
              //console.log(`all`,all)
              //console.log(`mobile`,mobile)
              //console.log(`tablet`,tablet)
              //console.log(`desktop`,desktop)
              //console.log(``)
              //return all[0];
              switch (viewport) {
                case "desktop":
                  return desktop[0];
                case "tablet":
                  return tablet[0];
                case "mobile":
                  return mobile[0];
                default:
                  return all[0];
              }
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
  }

  getNodeStringStyles(nodeId: string, viewport: ViewportKey): string {
    const node = this.allNodes.get().get(nodeId);
    return this.getStringNodeStyles(node, viewport);
  }

  getNodeCSSPropertiesStyles(nodeId: string, viewport: ViewportKey): CSSProperties {
    const node = this.allNodes.get().get(nodeId);
    return this.getReactNodeStyles(node, viewport);
  }

  getReactNodeStyles(node: BaseNode | undefined, viewport: ViewportKey): CSSProperties {
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
  }

  getStringNodeStyles(node: BaseNode | undefined, viewport: ViewportKey): string {
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
  }

  addPaneToStoryFragment(nodeId: string, pane: PaneNode, location: "before" | "after") {
    const node = this.allNodes.get().get(nodeId) as BaseNode;
    if (!node || (node.nodeType !== "StoryFragment" && node.nodeType !== "Pane")) {
      return;
    }

    pane.id = ulid();
    this.addNode(pane);

    if (node.nodeType === "Pane") {
      const storyFragmentId = this.getClosestNodeTypeFromId(nodeId, "StoryFragment");
      const storyFragment = this.allNodes.get().get(storyFragmentId) as StoryFragmentNode;
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
  }

  notifyNode(nodeId: string, payload?: BaseNode) {
    let notifyNodeId = nodeId;
    if (notifyNodeId === this.rootNodeId.get()) {
      notifyNodeId = ROOT_NODE_NAME;
    }
    this.notifications.notify(notifyNodeId, payload);
  }

  addTemplatePane(
    ownerId: string,
    pane: TemplatePane,
    insertPaneId?: string,
    location?: "before" | "after"
  ) {
    const ownerNode = this.allNodes.get().get(ownerId);
    if (
      ownerNode?.nodeType !== "StoryFragment" &&
      ownerNode?.nodeType !== "Root" &&
      ownerNode?.nodeType !== "File" &&
      ownerNode?.nodeType !== "TractStack"
    ) {
      return;
    }
    const duplicatedPane = cloneDeep(pane) as TemplatePane;
    const duplicatedPaneId = ulid();
    duplicatedPane.id = duplicatedPaneId;
    duplicatedPane.parentId = ownerNode.id;

    duplicatedPane.markdown = cloneDeep(pane.markdown) as TemplateMarkdown;
    duplicatedPane.markdown.id = ulid();
    duplicatedPane.markdown.parentId = duplicatedPaneId;
    const markdownNodes: TemplateNode[] = [];
    // add self
    duplicatedPane.markdown.nodes?.forEach((node) => {
      // retrieve flattened children nodes
      const childrenNodes = this.setupTemplateNodeRecursively(node, duplicatedPane.markdown.id);
      // flatten children nodes so they're the same level as our pane
      childrenNodes.forEach((childrenNode) => markdownNodes.push(childrenNode));
    });

    // add pane but manually as addNodes will skip pane addition due to storyfragments rule
    this.addNode(duplicatedPane as PaneNode);
    this.linkChildToParent(duplicatedPane.id, duplicatedPane.parentId);

    // add markdown now since pane already exists
    this.addNode(duplicatedPane.markdown as MarkdownPaneFragmentNode);

    // add the result of the markdown nodes
    this.addNodes(markdownNodes);
    this.notifyNode(ownerId);
  }

  addTemplateNode(
    markdownId: string,
    node: TemplateNode,
    insertNodeId?: string,
    location?: "before" | "after"
  ) {
    const markdownNode = this.allNodes.get().get(markdownId) as MarkdownPaneFragmentNode;
    if (!markdownNode || markdownNode.nodeType !== "Markdown") {
      return;
    }

    const duplicatedNodes = cloneDeep(node) as TemplateNode;
    const flattenedNodes = this.setupTemplateNodeRecursively(duplicatedNodes, markdownNode.id);
    // register flattened nodes to all nodes and set up relationship with its parent
    this.addNodes(flattenedNodes);

    const markdownNodes = this.parentNodes.get().get(markdownId);
    // now grab parent nodes, check if we have inner node
    if (insertNodeId && markdownNodes && markdownNodes?.indexOf(insertNodeId) !== -1) {
      const newNode = markdownNodes.splice(markdownNodes.indexOf(duplicatedNodes.id, 1));
      if (location === "before") {
        markdownNodes.insertBefore(markdownNodes.indexOf(insertNodeId), newNode);
      } else {
        markdownNodes.insertAfter(markdownNodes.indexOf(insertNodeId), newNode);
      }
    }
    this.notifyNode(markdownId);
  }

  setupTemplateNodeRecursively(node: TemplateNode, parentId: string) {
    let result: TemplateNode[] = [];
    if (!node) return result;

    node.id = ulid();
    node.parentId = parentId;
    result.push(node);
    if ("nodes" in node && node.nodes) {
      for (let i = 0; i < node.nodes.length; ++i) {
        result = result.concat(this.setupTemplateNodeRecursively(node.nodes[i], node.id));
      }
    }
    return result;
  }

  deleteNode(nodeId: string) {
    const node = this.allNodes.get().get(nodeId) as BaseNode;
    if (!node) {
      return;
    }

    const parentId = node.parentId;
    this.deleteNodesRecursively(node);
    // if this was a pane node then we need to update storyfragment as it tracks panes
    if (parentId !== null) {
      if (node.nodeType === "Pane") {
        const storyFragment = this.allNodes.get().get(parentId) as StoryFragmentNode;
        if (storyFragment) {
          storyFragment.paneIds.splice(storyFragment.paneIds.indexOf(nodeId), 1);
        }
      }

      this.notifyNode(parentId);
    } else {
      // we deleted the node without a parent, send a notification to the root and let storykeep handle it
      // it might be safe to refresh the whole page
      if (nodeId === this.rootNodeId.get()) {
        // if we actually deleted the root then clear it up
        this.rootNodeId.set("");
      }
      this.notifyNode(ROOT_NODE_NAME);
    }
  }

  deleteNodesRecursively(node: BaseNode | undefined) {
    if (!node) return;

    this.getChildNodeIDs(node.id).forEach((id) => {
      this.deleteNodesRecursively(this.allNodes.get().get(id));
    });
    // remove node
    this.allNodes.get().delete(node.id);

    // remove parent link too
    if (node.parentId !== null) {
      const parentNode = this.parentNodes.get().get(node.parentId);
      if (parentNode) {
        parentNode.splice(parentNode.indexOf(node.id), 1);
      }
    }
  }
}

export const globalCtx: NodesContext = new NodesContext();

export const getCtx = (props?: NodeProps | ReactNodesRendererProps | WidgetProps): NodesContext => {
  return props?.ctx || globalCtx;
};
