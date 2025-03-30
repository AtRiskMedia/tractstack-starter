import { atom, map } from "nanostores";
import {
  hasButtonPayload,
  hasTagName,
  isDefined,
  isValidTag,
  toTag,
} from "../utils/nodes/type-guards";
import { startLoadingAnimation } from "@/utils/common/helpers";
import { settingsPanelStore } from "@/store/storykeep.ts";
import { PaneAddMode, StoryFragmentMode, ContextPaneMode } from "@/types";
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
  Tag,
  TemplateMarkdown,
  TemplateNode,
  TemplatePane,
  ToolModeVal,
  TractStackNode,
  ViewportKey,
  ActivePaneMode,
  NodeProps,
  OgImageParams,
} from "@/types.ts";
import type { LoadData } from "@/store/nodesSerializer.ts";
import type { CSSProperties } from "react";
import { processClassesForViewports } from "@/utils/nodes/reduceNodesClassNames.ts";
import type { BeliefDatum } from "../types.ts";
import { ulid } from "ulid";
import { NotificationSystem } from "@/store/notificationSystem.ts";
import type { ReactNodesRendererProps } from "@/components/compositor-nodes/ReactNodesRenderer.tsx";
import type { WidgetProps } from "@/components/compositor-nodes/nodes/Widget.tsx";
import { cloneDeep, isDeepEqual } from "@/utils/common/helpers.ts";
import { handleClickEventDefault } from "@/utils/nodes/handleClickEvent_default.ts";
import allowInsert from "@/utils/nodes/allowInsert.ts";
import { reservedSlugs } from "@/constants.ts";
import { NodesHistory, PatchOp } from "@/store/nodesHistory.ts";
import { moveNodeAtLocationInContext } from "@/utils/common/nodesHelper.ts";
import { MarkdownGenerator } from "@/utils/common/nodesMarkdownGenerator.ts";

const blockedClickNodes = new Set<string>(["em", "strong"]);
export const ROOT_NODE_NAME = "root";
export const UNDO_REDO_HISTORY_CAPACITY = 500;

function strippedStyles(obj: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, value[0]]));
}
function addHoverPrefix(str: string): string {
  return str
    .split(" ")
    .map((word) => `hover:${word}`)
    .join(" ");
}

export class NodesContext {
  constructor() {}

  notifications = new NotificationSystem<BaseNode>();
  allNodes = atom<Map<string, BaseNode>>(new Map<string, BaseNode>());
  impressionNodes = atom<Set<ImpressionNode>>(new Set<ImpressionNode>());
  parentNodes = atom<Map<string, string[]>>(new Map<string, string[]>());
  hasTitle = atom<boolean>(false);
  hasPanes = atom<boolean>(false);
  rootNodeId = atom<string>("");
  clickedNodeId = atom<string>("");
  ghostTextActiveId = atom<string>("");
  clickedParentLayer = atom<number | null>(null);
  activePaneMode = atom<ActivePaneMode>({
    paneId: "",
    mode: "",
    panel: "",
  });
  history = new NodesHistory(this, UNDO_REDO_HISTORY_CAPACITY);

  toolModeValStore = map<{ value: ToolModeVal }>({
    value: "text",
  });

  paneAddMode = map<Record<string, PaneAddMode>>({});
  setPaneAddMode(nodeId: string, mode: PaneAddMode) {
    this.paneAddMode.setKey(nodeId, mode);
  }
  getPaneAddMode(nodeId: string): PaneAddMode {
    return this.paneAddMode.get()[nodeId] || PaneAddMode.DEFAULT;
  }

  contextPaneMode = map<Record<string, ContextPaneMode>>({});
  setContextPaneMode(nodeId: string, mode: ContextPaneMode) {
    this.contextPaneMode.setKey(nodeId, mode);
  }
  getContextPaneMode(nodeId: string): ContextPaneMode {
    return this.contextPaneMode.get()[nodeId] || ContextPaneMode.DEFAULT;
  }

  storyFragmentModeStore = map<Record<string, StoryFragmentMode>>({});
  setStoryFragmentMode(nodeId: string, mode: StoryFragmentMode) {
    this.storyFragmentModeStore.setKey(nodeId, mode);
  }
  getStoryFragmentMode(nodeId: string): StoryFragmentMode {
    return this.storyFragmentModeStore.get()[nodeId] || StoryFragmentMode.DEFAULT;
  }

  ogImageParamsStore = map<Record<string, OgImageParams>>({});

  getOgImageParams(nodeId: string): OgImageParams {
    const params = this.ogImageParamsStore.get()[nodeId];
    return (
      params || {
        textColor: "#fcfcfc",
        bgColor: "#10120d",
        fontSize: undefined,
      }
    );
  }

  setOgImageParams(nodeId: string, params: Partial<OgImageParams>): void {
    const currentParams = this.getOgImageParams(nodeId);
    this.ogImageParamsStore.setKey(nodeId, {
      ...currentParams,
      ...params,
    });
  }

  setActiveGhost(nodeId: string): void {
    const currentActiveId = this.ghostTextActiveId.get();

    // If this is already the active ghost, do nothing
    if (currentActiveId === nodeId) return;

    // If another ghost is active, clear it first
    if (currentActiveId && currentActiveId !== nodeId) {
      // Set to empty string to close any existing ghost
      this.ghostTextActiveId.set("");

      // After a short delay to allow the previous ghost to close,
      // set the new active ghost
      setTimeout(() => {
        this.ghostTextActiveId.set(nodeId);
      }, 100);
    } else {
      this.ghostTextActiveId.set(nodeId);
    }
  }

  updateHasPanesStatus() {
    const allNodes = this.allNodes.get();
    const storyFragments = Array.from(allNodes.values()).filter(
      (node) => node.nodeType === "StoryFragment"
    );
    const hasPanes = storyFragments.some(
      (node) => "paneIds" in node && (node.paneIds as string[]).length > 0
    );
    this.hasPanes.set(hasPanes);
  }

  cleanNode(nodeId: string) {
    const node = this.allNodes.get().get(nodeId);
    if (!node) return;
    const newNodes = new Map(this.allNodes.get());
    const cleanedNode = cloneDeep(node);
    if (cleanedNode.isChanged) delete cleanedNode.isChanged;
    newNodes.set(nodeId, cleanedNode);
    this.allNodes.set(newNodes);
  }

  getDirtyNodes(): BaseNode[] {
    const allNodes = Array.from(this.allNodes.get().values());
    return allNodes.filter(
      (node): node is BaseNode => "isChanged" in node && node.isChanged === true
    );
  }

  clearUndoHistory() {
    this.history.clearHistory();
  }

  getChildNodeIDs(parentNodeId: string): string[] {
    const returnVal = this.parentNodes.get()?.get(parentNodeId) || [];
    return returnVal;
  }

  setClickedParentLayer(layer: number | null) {
    this.clickedParentLayer.set(layer);
  }

  handleEraseEvent(nodeId: string) {
    const node = this.allNodes.get().get(nodeId) as FlatNode;
    if (!node) return;
    switch (node.nodeType) {
      case `Pane`: {
        const storyfragmentNodeId = this.getClosestNodeTypeFromId(nodeId, "StoryFragment");
        const storyfragmentNode = cloneDeep(
          this.allNodes.get().get(storyfragmentNodeId)
        ) as StoryFragmentNode;
        this.modifyNodes([{ ...storyfragmentNode, isChanged: true }]);
        break;
      }
      case `TagElement`: {
        const paneNodeId = this.getClosestNodeTypeFromId(nodeId, "Pane");
        const paneNode = cloneDeep(this.allNodes.get().get(paneNodeId)) as PaneNode;
        this.modifyNodes([{ ...paneNode, isChanged: true }]);
        break;
      }
      default:
    }
  }

  handleClickEvent(dblClick: boolean = false) {
    const toolModeVal = this.toolModeValStore.get().value;
    const node = this.allNodes.get().get(this.clickedNodeId.get()) as FlatNode;
    if (!node) return;

    // click handler based on toolModeVal
    switch (toolModeVal) {
      case `default`:
        handleClickEventDefault(node, dblClick, this.clickedParentLayer.get());
        break;
      case `text`:
        // Only handle double-clicks in text mode like default mode
        if (dblClick && ![`Pane`, `Parkdown`].includes(node.nodeType)) {
          handleClickEventDefault(node, dblClick, this.clickedParentLayer.get());
        }
        break;
      case `eraser`:
        this.handleEraseEvent(node.id);
        this.deleteNode(node.id);
        break;
      default:
    }
    // reset on parentLayer
    this.setClickedParentLayer(null);
  }

  private clickTimer: number | null = null;
  private DOUBLE_CLICK_DELAY = 300;
  private isProcessingDoubleClick = false;
  private lastProcessedTime = 0;

  setClickedNodeId(nodeId: string, dblClick: boolean = false) {
    const now = Date.now();
    // Prevent processing if we're too close to the last event
    if (now - this.lastProcessedTime < 50 || this.isProcessingDoubleClick) return;
    let node = this.allNodes.get().get(nodeId) as FlatNode;
    if (node && "tagName" in node) {
      while (node.parentId !== null && blockedClickNodes.has(node.tagName)) {
        node = this.allNodes.get().get(node.parentId) as FlatNode;
      }
      if (!node) return;
    }

    // Handle double click
    if (dblClick) {
      if (this.clickTimer) {
        window.clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }
      this.isProcessingDoubleClick = true;
      this.clickedNodeId.set(node.id);
      this.lastProcessedTime = now;
      window.setTimeout(() => {
        this.isProcessingDoubleClick = false;
      }, 100);
      this.handleClickEvent(true);
      return;
    }

    // Handle single click with delay for potential double click
    if (this.clickTimer) {
      window.clearTimeout(this.clickTimer);
    }
    this.clickTimer = window.setTimeout(() => {
      if (!this.isProcessingDoubleClick) {
        this.clickTimer = null;
        this.clickedNodeId.set(node.id);
        this.lastProcessedTime = Date.now();
        this.handleClickEvent(false);
      }
    }, this.DOUBLE_CLICK_DELAY);
  }

  clearAll() {
    this.paneAddMode.set({});
    this.contextPaneMode.set({});
    this.storyFragmentModeStore.set({});
    this.allNodes.get().clear();
    this.parentNodes.get().clear();
    this.impressionNodes.get().clear();
    this.rootNodeId.set("");
    this.notifications.clear();
  }

  buildNodesTreeFromRowDataMadeNodes(nodes: LoadData | null) {
    if (nodes !== null) {
      this.clearAll();
      if (nodes?.fileNodes) this.addNodes(nodes.fileNodes);
      if (nodes?.menuNodes) this.addNodes(nodes.menuNodes);
      if (nodes?.resourceNodes) this.addNodes(nodes.resourceNodes);
      if (nodes?.tractstackNodes) this.addNodes(nodes.tractstackNodes);
      // IMPORTANT!
      // pane nodes have to be added BEFORE StoryFragment nodes so they can register in this.allNodes
      if (nodes?.paneNodes) this.addNodes(nodes.paneNodes);
      // add childNodes after panes
      if (nodes?.childNodes) this.addNodes(nodes.childNodes);
      // then storyfragment nodes will link pane nodes from above

      // for compatibility (until we remove buildNodesTreeFromFragmentNodes)
      if (nodes?.impressionNodes) this.addNodes(nodes.impressionNodes);
      if (nodes?.paneFragmentNodes) this.addNodes(nodes.paneFragmentNodes);
      if (nodes?.flatNodes) this.addNodes(nodes.flatNodes);

      // then add storyfragmentNodes
      if (nodes?.storyfragmentNodes) this.addNodes(nodes.storyfragmentNodes);

      this.updateHasPanesStatus();
    }
  }

  // this is for old data model once converted to nodes
  buildNodesTreeFromFragmentNodes(nodes: LoadData | null) {
    if (nodes !== null) {
      this.clearAll();
      if (nodes?.fileNodes) this.addNodes(nodes.fileNodes);
      if (nodes?.menuNodes) this.addNodes(nodes.menuNodes);
      if (nodes?.resourceNodes) this.addNodes(nodes.resourceNodes);
      if (nodes?.tractstackNodes) this.addNodes(nodes.tractstackNodes);
      // IMPORTANT!
      // pane nodes have to be added BEFORE StoryFragment nodes so they can register in this.allNodes
      if (nodes?.paneNodes) this.addNodes(nodes.paneNodes);
      if (nodes?.impressionNodes) this.addNodes(nodes.impressionNodes);
      if (nodes?.paneFragmentNodes) this.addNodes(nodes.paneFragmentNodes);
      if (nodes?.flatNodes) this.addNodes(nodes.flatNodes);
      // then storyfragment nodes will link pane nodes from above
      if (nodes?.storyfragmentNodes) this.addNodes(nodes.storyfragmentNodes);
      this.updateHasPanesStatus();
    }
  }

  linkChildToParent(nodeId: string, parentId: string, specificIndex: number = -1) {
    const parentNode = this.parentNodes.get();
    if (parentNode.has(parentId)) {
      if (specificIndex === -1) {
        parentNode.get(parentId)?.push(nodeId);
      } else {
        parentNode.get(parentId)?.insertBefore(Math.max(0, specificIndex), [nodeId]);
      }
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
    this.updateHasPanesStatus();
  }

  addNodes(nodes: BaseNode[]) {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  allowInsert(
    nodeId: string,
    tagNameStr: string
  ): {
    allowInsertBefore: boolean;
    allowInsertAfter: boolean;
  } {
    const node = this.allNodes.get().get(nodeId);
    if (!isDefined(node) || !hasTagName(node)) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }
    const markdownId = this.getClosestNodeTypeFromId(nodeId, "Markdown");
    const tagNameIds = this.getChildNodeIDs(markdownId);
    const tagNames = tagNameIds
      .map((id) => {
        const name = this.getNodeTagName(id);
        return toTag(name);
      })
      .filter((name): name is Tag => name !== null);

    const offset = tagNameIds.indexOf(nodeId);
    const tagName = toTag(tagNameStr);

    if (!tagName || !isValidTag(node.tagName)) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }

    const allowInsertBefore =
      offset > -1
        ? allowInsert(node, node.tagName as Tag, tagName, offset ? tagNames[offset - 1] : undefined)
        : allowInsert(node, node.tagName as Tag, tagName);

    const allowInsertAfter =
      tagNames.length > offset
        ? allowInsert(node, node.tagName as Tag, tagName, tagNames[offset + 1])
        : allowInsert(node, node.tagName as Tag, tagName);

    return { allowInsertBefore, allowInsertAfter };
  }

  allowInsertLi(
    nodeId: string,
    tagNameStr: string
  ): {
    allowInsertBefore: boolean;
    allowInsertAfter: boolean;
  } {
    const node = this.allNodes.get().get(nodeId);
    if (!isDefined(node) || !hasTagName(node) || !node.parentId) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }

    const tagNameIds = this.getChildNodeIDs(node.parentId);
    const tagNames = tagNameIds
      .map((id) => {
        const name = this.getNodeTagName(id);
        return toTag(name);
      })
      .filter((name): name is Tag => name !== null);

    const offset = tagNameIds.indexOf(nodeId);
    const tagName = toTag(tagNameStr);

    if (!tagName || !isValidTag(node.tagName)) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }

    const allowInsertBefore =
      offset > 0
        ? allowInsert(node, node.tagName as Tag, tagName, tagNames[offset - 1])
        : allowInsert(node, node.tagName as Tag, tagName);

    const allowInsertAfter =
      tagNames.length < offset
        ? allowInsert(node, node.tagName as Tag, tagName, tagNames[offset + 1])
        : allowInsert(node, node.tagName as Tag, tagName);

    return { allowInsertBefore, allowInsertAfter };
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

  getChildNodeByTagNames(startNodeId: string, tagNames: string[]): string {
    const node = this.allNodes.get().get(startNodeId);
    if (!node || node.nodeType === "Root") return "";

    let firstChildId = "";
    if ("tagName" in node && tagNames.includes(node.tagName as string)) {
      firstChildId = node.id;
      return firstChildId;
    }
    this.getChildNodeIDs(node.id).forEach((childId) => {
      const foundId = this.getChildNodeByTagNames(childId, tagNames);
      if (foundId.length > 0 && firstChildId.length === 0) {
        firstChildId = foundId;
      }
    });
    return firstChildId;
  }

  getParentNodeByTagNames(startNodeId: string, tagNames: string[]): string {
    const node = this.allNodes.get().get(startNodeId);
    if (!node || node.nodeType === "Root") return "";

    const parentId = node.parentId || "";
    const parentNode = this.allNodes.get().get(parentId);
    if (parentNode && "tagName" in parentNode && tagNames.includes(parentNode.tagName as string)) {
      return parentId;
    } else {
      return this.getParentNodeByTagNames(parentId, tagNames);
    }
  }

  //getStyleByViewport(
  //  defaultClasses:
  //    | {
  //        mobile?: Record<string, string> | undefined;
  //        tablet?: Record<string, string> | undefined;
  //        desktop?: Record<string, string> | undefined;
  //      }
  //    | undefined,
  //  viewport: ViewportKey
  //): Record<string, string> {
  //  switch (viewport) {
  //    case "desktop":
  //      return defaultClasses?.desktop || {};
  //    case "tablet":
  //      return defaultClasses?.tablet || {};
  //    default:
  //    case "mobile":
  //      return defaultClasses?.mobile || {};
  //  }
  //}

  getNodeSlug(nodeId: string): string {
    const node = this.allNodes.get().get(nodeId);
    if (!node || !(`slug` in node) || typeof node.slug !== `string`) return "";
    return node.slug;
  }

  getNodeTagName(nodeId: string): string {
    const node = this.allNodes.get().get(nodeId);
    if (!node || !(`tagName` in node) || typeof node.tagName !== `string`) return "";
    return node.tagName;
  }

  getIsContextPane(nodeId: string): boolean {
    const node = this.allNodes.get().get(nodeId);
    if (!node || !(`isContextPane` in node)) return false;
    return !!node.isContextPane;
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

  getPaneSlug(nodeId: string): string | null {
    const node = this.allNodes.get().get(nodeId);
    if (!node || node.nodeType !== "Pane") {
      return null;
    }
    if (!("slug" in node) || typeof node.slug !== "string") {
      return null;
    }
    return node.slug;
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

  getPaneIsDecorative(nodeId: string): boolean {
    const paneNode = this.allNodes.get().get(nodeId) as PaneNode;
    if (paneNode.nodeType !== "Pane") {
      return false;
    }
    if (paneNode.isDecorative) return true;
    return false;
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
    const isPreview = this.rootNodeId.get() === `tmp`;
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

            if (isPreview) return desktop[0];
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
          const getButtonClasses = (node: FlatNode) => {
            return {
              mobile: strippedStyles(node.buttonPayload?.buttonClasses || {}),
              tablet: {},
              desktop: {},
            };
          };

          const getHoverClasses = (node: FlatNode) => {
            return {
              mobile: strippedStyles(node.buttonPayload?.buttonHoverClasses || {}),
              tablet: {},
              desktop: {},
            };
          };

          if (hasButtonPayload(node)) {
            const [classesPayload] = processClassesForViewports(getButtonClasses(node), {}, 1);
            const [classesHoverPayload] = processClassesForViewports(getHoverClasses(node), {}, 1);
            return `${classesPayload?.length ? classesPayload[0] : ``} ${
              classesHoverPayload?.length ? addHoverPrefix(classesHoverPayload[0]) : ``
            }`;
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
              if (isPreview) return desktop[0];
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
          : `bg-white`;
      }
    }
    return "";
  }

  nodeToNotify(nodeId: string, nodeType: string) {
    switch (nodeType) {
      case `StoryFragment`:
        return `root`;
      case `Pane`:
        if (this.getIsContextPane(nodeId)) return `root`;
        return this.getClosestNodeTypeFromId(nodeId, "StoryFragment");
      case `TagElement`:
      case `BgPane`:
      case `Markdown`:
      case `Impression`:
        return this.getClosestNodeTypeFromId(nodeId, "Pane");
      case `Menu`:
        // do nothing
        break;
      default:
        console.log(`nodeToNotify missed on`, nodeType);
    }
  }

  modifyNodes(newData: BaseNode[]) {
    // if all nodes are the same, skip
    if (!this.checkAnyNodeDifferent(newData)) return;

    const undoList: ((ctx: NodesContext) => void)[] = [];
    const redoList: ((ctx: NodesContext) => void)[] = [];
    for (let i = 0; i < newData.length; i++) {
      const node = newData[i];
      const currentNodeData = this.allNodes.get().get(node.id) as BaseNode;
      if (!currentNodeData) {
        console.warn("Trying to modify node that doesn't exist", node.id);
        continue;
      }
      if (isDeepEqual(currentNodeData, node, ["isChanged"])) {
        continue; // data is the same
      }

      switch (node.nodeType) {
        case `TagElement`:
        case `BgPane`:
        case `Markdown`: {
          const paneNodeId = this.getClosestNodeTypeFromId(node.id, "Pane");
          const paneNode = cloneDeep(this.allNodes.get().get(paneNodeId)) as PaneNode;
          this.modifyNodes([{ ...paneNode, isChanged: true }]);
          break;
        }
        case `Menu`:
        case `Pane`:
        case `StoryFragment`:
          // do nothing *already set isChanged
          break;

        default:
          console.log(`must dirty check missed on `, node.nodeType);
      }

      const newNodes = new Map(this.allNodes.get());
      newNodes.set(node.id, node);
      this.allNodes.set(newNodes);

      undoList.push((ctx: NodesContext) => {
        const newNodes = new Map(ctx.allNodes.get());
        newNodes.set(node.id, currentNodeData);
        ctx.allNodes.set(newNodes);
        const parentNode = this.nodeToNotify(node.id, node.nodeType);
        if (parentNode) this.notifyNode(parentNode);
      });
      redoList.push((ctx: NodesContext) => {
        const newNodes = new Map(ctx.allNodes.get());
        newNodes.set(node.id, node);
        ctx.allNodes.set(newNodes);
        const parentNode = this.nodeToNotify(node.id, node.nodeType);
        if (parentNode) this.notifyNode(parentNode);
      });

      const parentNode = this.nodeToNotify(node.id, node.nodeType);
      if (parentNode) this.notifyNode(parentNode);
    }

    this.history.addPatch({
      op: PatchOp.REPLACE,
      undo: (ctx) => {
        undoList.forEach((fn) => fn(ctx));
      },
      redo: (ctx) => {
        redoList.forEach((fn) => fn(ctx));
      },
    });
  }

  private checkAnyNodeDifferent(newData: BaseNode[]) {
    let isAnyNodeDifferent = false;
    newData.forEach((nodeData) => {
      const node = nodeData;
      const currentNodeData = this.allNodes.get().get(node.id) as BaseNode;
      if (!isDeepEqual(currentNodeData, node, ["isChanged"])) {
        isAnyNodeDifferent = true;
      }
    });
    return isAnyNodeDifferent;
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
    if (nodeId === `root`) startLoadingAnimation();
    this.updateHasPanesStatus();
    this.notifications.notify(notifyNodeId, payload);
  }

  addContextTemplatePane(ownerId: string, pane: TemplatePane) {
    const ownerNode = this.allNodes.get().get(ownerId);
    if (ownerNode?.nodeType === "Pane") {
      const pane = ownerNode as PaneNode;
      if (!pane.isContextPane) {
        return;
      }
    }
    const duplicatedPane = cloneDeep(pane) as TemplatePane;
    duplicatedPane.id = ownerId;
    if (ownerNode && "title" in ownerNode && typeof ownerNode.title === `string`)
      duplicatedPane.title = ownerNode.title;
    if (ownerNode && "slug" in ownerNode && typeof ownerNode.slug === `string`)
      duplicatedPane.slug = ownerNode.slug;
    duplicatedPane.isChanged = true;

    // Track all nodes that need to be added
    let allNodes: BaseNode[] = [];

    // must generate nodes from markdown
    if (duplicatedPane.markdown) {
      duplicatedPane.markdown = cloneDeep(pane.markdown) as TemplateMarkdown;
      duplicatedPane.markdown.id = pane?.markdown?.id || ulid();
      duplicatedPane.markdown.markdownId = pane?.markdown?.markdownId || ulid();
      duplicatedPane.markdown.parentId = ownerId;

      let markdownNodes: TemplateNode[] = [];
      if (duplicatedPane.markdown.markdownBody) {
        const markdownGen = new MarkdownGenerator(this);
        markdownNodes = markdownGen.markdownToFlatNodes(
          duplicatedPane.markdown.markdownBody,
          duplicatedPane.markdown.id
        ) as TemplateNode[];
        allNodes = [...allNodes, duplicatedPane.markdown, ...markdownNodes];
      }

      // Markdown already as nodes
      else if (
        typeof duplicatedPane.markdown !== `undefined` &&
        typeof duplicatedPane.markdown.id === `string`
      ) {
        duplicatedPane?.markdown.nodes?.forEach((node) => {
          const childrenNodes = this.setupTemplateNodeRecursively(
            node,
            duplicatedPane?.markdown?.id || ""
          );
          markdownNodes.push(...childrenNodes);
        });
        allNodes = [...allNodes, duplicatedPane.markdown, ...markdownNodes];
      }
    }

    this.addNode(duplicatedPane as PaneNode);
    this.addNodes(allNodes);
    this.notifyNode(ownerId);

    return ownerId;
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
    const duplicatedPaneId = pane?.id || ulid();
    duplicatedPane.id = duplicatedPaneId;
    duplicatedPane.parentId = ownerNode.id;
    duplicatedPane.isChanged = true;

    if (this.rootNodeId.get() !== "tmp") {
      if (
        ownerNode.nodeType === "StoryFragment" &&
        "slug" in ownerNode &&
        "title" in ownerNode &&
        typeof ownerNode.title === `string` &&
        duplicatedPane.slug === "" &&
        duplicatedPane.title === ""
      ) {
        // Take storyfragment slug and last 4 chars of pane's ulid
        duplicatedPane.slug = `${ownerNode.slug}-${duplicatedPaneId.slice(-4)}`;
        duplicatedPane.title = `${ownerNode.title.slice(0, 20)}-${duplicatedPaneId.slice(-4)}`;
      }
    }

    // Track all nodes that need to be added
    let allNodes: BaseNode[] = [];

    // must generate nodes from markdown
    if (duplicatedPane.markdown) {
      duplicatedPane.markdown = cloneDeep(pane.markdown) as TemplateMarkdown;
      duplicatedPane.markdown.id = pane?.markdown?.id || ulid();
      duplicatedPane.markdown.markdownId = pane?.markdown?.markdownId || ulid();
      duplicatedPane.markdown.parentId = duplicatedPaneId;

      let markdownNodes: TemplateNode[] = [];
      if (duplicatedPane.markdown.markdownBody) {
        const markdownGen = new MarkdownGenerator(this);
        markdownNodes = markdownGen.markdownToFlatNodes(
          duplicatedPane.markdown.markdownBody,
          duplicatedPane.markdown.id
        ) as TemplateNode[];
        allNodes = [...allNodes, duplicatedPane.markdown, ...markdownNodes];
      }

      // Markdown already as nodes
      else if (
        typeof duplicatedPane.markdown !== `undefined` &&
        typeof duplicatedPane.markdown.id === `string`
      ) {
        duplicatedPane?.markdown.nodes?.forEach((node) => {
          const childrenNodes = this.setupTemplateNodeRecursively(
            node,
            duplicatedPane?.markdown?.id || ""
          );
          markdownNodes.push(...childrenNodes);
        });
        allNodes = [...allNodes, duplicatedPane.markdown, ...markdownNodes];
      }
    }
    // Handle visual break panes
    else if (duplicatedPane.bgPane) {
      const bgPaneId = ulid();
      const bgPaneNode = {
        id: bgPaneId,
        nodeType: "BgPane",
        parentId: duplicatedPaneId,
        type: "visual-break",
        breakDesktop: duplicatedPane.bgPane.breakDesktop,
        breakTablet: duplicatedPane.bgPane.breakTablet,
        breakMobile: duplicatedPane.bgPane.breakMobile,
      } as PaneFragmentNode;

      allNodes = [bgPaneNode];
      // Remove bgPane from duplicatedPane to avoid duplication
      delete duplicatedPane.bgPane;
    }

    const storyFragmentNode = ownerNode as StoryFragmentNode;
    let specificIdx = -1;
    let elIdx = -1;
    let storyFragmentWasChanged: boolean = false;

    if (insertPaneId && location && storyFragmentNode?.nodeType === "StoryFragment") {
      storyFragmentWasChanged = storyFragmentNode.isChanged || false;
      specificIdx = storyFragmentNode.paneIds.indexOf(insertPaneId);
      elIdx = specificIdx;
      if (elIdx === -1) {
        storyFragmentNode.paneIds.push(duplicatedPane.id);
      } else {
        if (location === "before") {
          storyFragmentNode.paneIds.insertBefore(elIdx, [duplicatedPane.id]);
          specificIdx = Math.max(0, specificIdx - 1);
        } else {
          storyFragmentNode.paneIds.insertAfter(elIdx, [duplicatedPane.id]);
          specificIdx = Math.min(specificIdx + 1, storyFragmentNode.paneIds.length);
        }
      }
      storyFragmentNode.isChanged = true;
    }

    // Add pane but manually as addNodes will skip pane addition due to storyfragments rule
    this.addNode(duplicatedPane as PaneNode);
    this.linkChildToParent(duplicatedPane.id, duplicatedPane.parentId, specificIdx);

    // Add all child nodes
    this.addNodes(allNodes);
    this.notifyNode(ownerId);

    this.history.addPatch({
      op: PatchOp.ADD,
      undo: (ctx) => {
        ctx.deleteNodes(allNodes);

        if (
          storyFragmentNode &&
          storyFragmentNode.nodeType === "StoryFragment" &&
          Array.isArray(storyFragmentNode.paneIds)
        ) {
          storyFragmentNode.paneIds = storyFragmentNode.paneIds.filter(
            (id: string) => id !== duplicatedPane.id
          );
          storyFragmentNode.isChanged = storyFragmentWasChanged;
        }

        ctx.deleteNodes([duplicatedPane]);
      },
      redo: (ctx) => {
        if (storyFragmentNode?.nodeType === "StoryFragment") {
          if (elIdx === -1) {
            storyFragmentNode.paneIds.push(duplicatedPane.id);
          } else {
            if (location === "before") {
              storyFragmentNode.paneIds.insertBefore(elIdx, [duplicatedPane.id]);
            } else {
              storyFragmentNode.paneIds.insertAfter(elIdx, [duplicatedPane.id]);
            }
          }
          storyFragmentNode.isChanged = true;
        }

        ctx.addNodes([duplicatedPane]);
        ctx.linkChildToParent(duplicatedPane.id, duplicatedPane.parentId, specificIdx);
        ctx.addNodes(allNodes);
      },
    });

    return duplicatedPaneId;
  }

  handleInsertSignal(tagName: string, nodeId: string) {
    switch (tagName) {
      case `a`:
        settingsPanelStore.set({
          action: `style-link`,
          nodeId: nodeId,
          expanded: true,
        });
        break;
      case `img`:
        settingsPanelStore.set({
          action: `style-image`,
          nodeId: nodeId,
          expanded: true,
        });
        break;
      case `code`:
        settingsPanelStore.set({
          action: `style-widget`,
          nodeId: nodeId,
          expanded: true,
        });
        break;
    }
    this.toolModeValStore.set({ value: "text" });
  }

  addTemplateImpressionNode(targetId: string, node: ImpressionNode) {
    const targetNode = this.allNodes.get().get(targetId) as BaseNode;
    if (!targetNode || targetNode.nodeType !== "Pane") {
      return;
    }
    const duplicatedNodes = cloneDeep(node) as TemplateNode;
    const flattenedNodes = this.setupTemplateNodeRecursively(duplicatedNodes, targetId);
    this.addNodes(flattenedNodes);
    this.history.addPatch({
      op: PatchOp.ADD,
      undo: (ctx) => ctx.deleteNodes(flattenedNodes),
      redo: (ctx) => ctx.addNodes(flattenedNodes),
    });
  }

  addTemplateNode(
    targetId: string,
    node: TemplateNode,
    insertNodeId?: string,
    location?: "before" | "after"
  ): string | null {
    const targetNode = this.allNodes.get().get(targetId) as BaseNode;
    if (
      !targetNode ||
      (targetNode.nodeType !== "Markdown" && targetNode.nodeType !== "TagElement")
    ) {
      return null;
    }

    const parentId = this.getClosestNodeTypeFromId(targetId, "Markdown");
    const duplicatedNodes = cloneDeep(node) as TemplateNode;
    let flattenedNodes: TemplateNode[] = [];

    // mark pane as changed
    const paneNodeId = this.getClosestNodeTypeFromId(targetId, "Pane");
    if (paneNodeId) {
      const paneNode = cloneDeep(this.allNodes.get().get(paneNodeId)) as PaneNode;
      if (paneNode) {
        this.modifyNodes([{ ...paneNode, isChanged: true }]);
      }
    }

    // Check if we need to wrap in ul/li structure
    if (["img", "code"].includes(duplicatedNodes.tagName)) {
      // Look for existing ul parent
      let closestListNode = "";
      if ("tagName" in targetNode && ["ol", "ul"].includes(targetNode.tagName as string)) {
        closestListNode = targetId;
      } else {
        closestListNode = this.getParentNodeByTagNames(targetId, ["ol", "ul"]);
      }

      if (!closestListNode) {
        // Create new ul wrapper if none exists
        const ulNode: TemplateNode = {
          id: ulid(),
          nodeType: "TagElement",
          tagName: "ul",
          parentId: parentId,
        };

        const liNode: TemplateNode = {
          id: ulid(),
          nodeType: "TagElement",
          tagName: "li",
          tagNameCustom: duplicatedNodes.tagName,
          parentId: ulNode.id,
        };

        duplicatedNodes.parentId = liNode.id;

        // Create flattened node structure
        flattenedNodes = [
          ulNode,
          liNode,
          ...this.setupTemplateNodeRecursively(duplicatedNodes, liNode.id),
        ];

        this.addNodes(flattenedNodes);
        this.history.addPatch({
          op: PatchOp.ADD,
          undo: (ctx) => ctx.deleteNodes(flattenedNodes),
          redo: (ctx) => ctx.addNodes(flattenedNodes),
        });

        // Handle insertion position
        const newNodeId = ulNode.id;
        const parentNodes = this.parentNodes.get().get(parentId);
        if (insertNodeId && parentNodes && parentNodes?.indexOf(insertNodeId) !== -1) {
          const spliceIdx = parentNodes.indexOf(newNodeId);
          if (spliceIdx !== -1) {
            parentNodes.splice(spliceIdx, 1);
          }
          if (location === "before") {
            parentNodes.insertBefore(parentNodes.indexOf(insertNodeId), [newNodeId]);
          } else {
            parentNodes.insertAfter(parentNodes.indexOf(insertNodeId), [newNodeId]);
          }
        }
        this.notifyNode(this.getClosestNodeTypeFromId(targetId, "Markdown"));
        return duplicatedNodes.id;
      } else {
        // We found an existing ul, create a new li wrapper
        const liNode: TemplateNode = {
          id: ulid(),
          nodeType: "TagElement",
          tagName: "li",
          tagNameCustom: duplicatedNodes.tagName,
          parentId: closestListNode,
        };

        // Set up proper parent relationships
        duplicatedNodes.parentId = liNode.id;

        // Flatten all nodes with proper hierarchy
        flattenedNodes = [liNode, ...this.setupTemplateNodeRecursively(duplicatedNodes, liNode.id)];

        this.addNodes(flattenedNodes);
        this.history.addPatch({
          op: PatchOp.ADD,
          undo: (ctx) => ctx.deleteNodes(flattenedNodes),
          redo: (ctx) => ctx.addNodes(flattenedNodes),
        });

        // Handle insertion position
        const parentNodes = this.parentNodes.get().get(closestListNode);
        if (insertNodeId && parentNodes && parentNodes?.indexOf(insertNodeId) !== -1) {
          const spliceIdx = parentNodes.indexOf(liNode.id);
          if (spliceIdx !== -1) {
            parentNodes.splice(spliceIdx, 1);
          }
          if (location === "before") {
            parentNodes.insertBefore(parentNodes.indexOf(insertNodeId), [liNode.id]);
          } else {
            parentNodes.insertAfter(parentNodes.indexOf(insertNodeId), [liNode.id]);
          }
        }
        this.notifyNode(this.getClosestNodeTypeFromId(targetId, "Markdown"));
        return duplicatedNodes.id;
      }
    } else {
      // For non-img/code nodes, just flatten and add normally
      flattenedNodes = this.setupTemplateNodeRecursively(duplicatedNodes, parentId);
      this.addNodes(flattenedNodes);
      this.history.addPatch({
        op: PatchOp.ADD,
        undo: (ctx) => ctx.deleteNodes(flattenedNodes),
        redo: (ctx) => ctx.addNodes(flattenedNodes),
      });

      let newNodeId;
      const parentNodes = this.parentNodes.get().get(parentId);
      // Handle insertion for normal nodes
      if (insertNodeId && parentNodes && parentNodes?.indexOf(insertNodeId) !== -1) {
        const newNode = parentNodes.splice(parentNodes.indexOf(duplicatedNodes.id, 1));
        newNodeId = newNode.at(0);
        if (location === "before") {
          parentNodes.insertBefore(parentNodes.indexOf(insertNodeId), newNode);
        } else {
          parentNodes.insertAfter(parentNodes.indexOf(insertNodeId), newNode);
        }
      }
      if (newNodeId) {
        this.notifyNode(this.getClosestNodeTypeFromId(targetId, "Markdown"));
        return newNodeId;
      }
    }

    return null;
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

  deleteChildren(nodeId: string): BaseNode[] {
    const node = this.allNodes.get().get(nodeId);
    if (!node) return [];

    const children = this.getNodesRecursively(node).reverse();
    children.shift();
    const deletedNodes = this.deleteNodes(children);
    this.notifyNode(node.parentId || "");
    return deletedNodes;
  }

  deleteNode(nodeId: string) {
    // Get the original node
    const originalNode = this.allNodes.get().get(nodeId) as FlatNode;
    if (!originalNode) {
      return;
    }

    // Track if we're redirecting deletion
    let targetNodeId = nodeId;
    let targetNode = originalNode;

    // Case 1: Node is an LI - check if it's the last one in a list
    if (
      originalNode.nodeType === "TagElement" &&
      "tagName" in originalNode &&
      originalNode.tagName === "li" &&
      originalNode.parentId
    ) {
      const listNode = this.allNodes.get().get(originalNode.parentId) as FlatNode;

      if (
        listNode &&
        "tagName" in listNode &&
        (listNode.tagName === "ul" || listNode.tagName === "ol")
      ) {
        // Check if this LI is the last/only one
        const listChildren = this.getChildNodeIDs(listNode.id);
        const isLastLi = listChildren.length === 1 && listChildren[0] === nodeId;

        if (isLastLi) {
          // Redirect deletion to the list
          targetNodeId = listNode.id;
          targetNode = listNode;
        }
      }
    }

    // Case 2: Node is an image or code inside an LI
    else if (
      originalNode.nodeType === "TagElement" &&
      "tagName" in originalNode &&
      (originalNode.tagName === "img" || originalNode.tagName === "code")
    ) {
      // Find parent LI
      const liParentId = this.getParentNodeByTagNames(nodeId, ["li"]);

      if (liParentId) {
        const liNode = this.allNodes.get().get(liParentId) as FlatNode;

        // Check if this is the only child of the LI
        const liChildren = this.getChildNodeIDs(liParentId);

        // Calculate if content is the only significant child
        // (there might be text nodes with whitespace)
        const significantChildrenCount = liChildren.filter((childId) => {
          const child = this.allNodes.get().get(childId) as FlatNode;
          if (!child) return false;

          // Skip text nodes with only whitespace
          if (child.tagName === "text" && (!child.copy || child.copy.trim() === "")) {
            return false;
          }
          return true;
        }).length;

        const isOnlySignificantChild = significantChildrenCount === 1;

        if (isOnlySignificantChild && liNode?.parentId) {
          // Find list container (UL/OL)
          const listNode = this.allNodes.get().get(liNode.parentId) as FlatNode;

          if (
            listNode &&
            "tagName" in listNode &&
            (listNode.tagName === "ul" || listNode.tagName === "ol")
          ) {
            // Check if this LI is the last/only one
            const listChildren = this.getChildNodeIDs(listNode.id);
            const isLastLi = listChildren.length === 1 && listChildren[0] === liParentId;

            if (isLastLi) {
              // Redirect deletion to the list
              targetNodeId = listNode.id;
              targetNode = listNode;
            } else {
              // Redirect to the LI instead
              targetNodeId = liParentId;
              targetNode = liNode;
            }
          }
        }
      }
    }

    // Continue with normal deletion logic using the target node
    const parentId = targetNode.parentId;
    const toDelete = this.getNodesRecursively(targetNode).reverse();
    const closestMarkdownId = this.getClosestNodeTypeFromId(targetNode.id, "Markdown");

    this.deleteNodes(toDelete);
    let paneIdx: number = -1;

    // Process based on node type
    if (parentId !== null) {
      if (targetNode.nodeType === "Pane") {
        const storyFragment = this.allNodes.get().get(parentId) as StoryFragmentNode;
        if (storyFragment) {
          paneIdx = storyFragment.paneIds.indexOf(targetNodeId);
          storyFragment.paneIds.splice(paneIdx, 1);
        }
        this.notifyNode(parentId);
      } else if (targetNode.nodeType === "TagElement") {
        this.notifyNode(closestMarkdownId);
        // mark pane as changed
        const paneNodeId = this.getClosestNodeTypeFromId(closestMarkdownId, "Pane");
        if (paneNodeId) {
          const paneNode = cloneDeep(this.allNodes.get().get(paneNodeId)) as PaneNode;
          if (paneNode) {
            this.modifyNodes([{ ...paneNode, isChanged: true }]);
          }
        }
      } else {
        this.notifyNode(parentId);
      }
    } else {
      if (targetNodeId === this.rootNodeId.get()) {
        this.rootNodeId.set("");
      }
      this.notifyNode(ROOT_NODE_NAME);
    }

    // Add to history for undo/redo
    this.history.addPatch({
      op: PatchOp.REMOVE,
      undo: (ctx) => {
        ctx.addNodes(toDelete);
        if (targetNode.nodeType === "Pane" && parentId !== null) {
          const storyFragment = this.allNodes.get().get(parentId) as StoryFragmentNode;
          if (storyFragment) {
            storyFragment.paneIds.insertBefore(paneIdx, [targetNodeId]);
            this.linkChildToParent(targetNodeId, parentId, paneIdx);
          }
        }
      },
      redo: (ctx) => ctx.deleteNodes(toDelete),
    });
  }

  getNodesRecursively(node: BaseNode | undefined): BaseNode[] {
    let nodes: BaseNode[] = [];
    if (!node) return nodes;

    this.getChildNodeIDs(node.id).forEach((id) => {
      const collectedNodes = this.getNodesRecursively(this.allNodes.get().get(id));
      nodes = collectedNodes.concat(nodes);
    });

    nodes.push(node);
    return nodes;
  }

  moveNode(nodeId: string, location: "before" | "after") {
    const node = this.allNodes.get().get(nodeId);
    if (!node || node.nodeType === "Root") return;

    if (node.parentId) {
      const children = this.getChildNodeIDs(node.parentId);
      const idx = children.indexOf(nodeId);
      if (idx !== -1) {
        const newPosNodeId = children.at(
          location === "before" ? Math.max(idx - 1, 0) : Math.min(idx + 1, children.length - 1)
        );
        if (newPosNodeId) {
          this.moveNodeTo(nodeId, newPosNodeId, location);
        }
      }
    }
  }

  moveNodeTo(nodeId: string, insertNodeId: string, location: "before" | "after") {
    const node = this.allNodes.get().get(nodeId);
    if (!node || node.nodeType === "Root") return;

    const newLocationNode = this.allNodes.get().get(insertNodeId);
    if (!newLocationNode) return;

    if (nodeId === insertNodeId) return;

    if (node.nodeType !== newLocationNode.nodeType) {
      console.warn(
        `Trying to move nodes ${nodeId} and ${insertNodeId} but they're belong to different types`
      );
      return;
    }

    const oldParentId = node.parentId || "";
    const oldParentNodes = this.getChildNodeIDs(oldParentId);
    const originalIdx = oldParentNodes.indexOf(nodeId);

    // Capture original state for history
    let originalPaneIds: string[] | null = null;
    if (node.nodeType === "Pane") {
      const storyFragmentId = this.getClosestNodeTypeFromId(node.id, "StoryFragment");
      const storyFragment = this.allNodes.get().get(storyFragmentId) as StoryFragmentNode;
      if (storyFragment) {
        originalPaneIds = [...storyFragment.paneIds];
      }
    }

    moveNodeAtLocationInContext(
      oldParentNodes,
      originalIdx,
      newLocationNode,
      insertNodeId,
      nodeId,
      location,
      node,
      this
    );

    // Persist changes using cloneDeep and modifyNodes
    if (node.nodeType === "Pane") {
      const storyFragmentId = this.getClosestNodeTypeFromId(node.id, "StoryFragment");
      const storyFragment = cloneDeep(
        this.allNodes.get().get(storyFragmentId)
      ) as StoryFragmentNode;
      if (storyFragment) {
        this.modifyNodes([{ ...storyFragment, isChanged: true }]);
      }
    } else {
      const parentNode = this.nodeToNotify(
        newLocationNode?.parentId || "",
        newLocationNode.nodeType
      );
      this.notifyNode(parentNode || "");
    }

    this.history.addPatch({
      op: PatchOp.REPLACE,
      undo: (ctx) => {
        const oldParentNodes = ctx.getChildNodeIDs(node.parentId || "");
        const newParentNodes = ctx.getChildNodeIDs(newLocationNode.parentId || "");
        if (newParentNodes) {
          newParentNodes.splice(newParentNodes.indexOf(nodeId), 1);
        }
        if (oldParentNodes) {
          oldParentNodes.insertBefore(originalIdx, [nodeId]);
        }
        node.parentId = oldParentId;

        if (node.nodeType === "Pane" && originalPaneIds) {
          const storyFragmentId = ctx.getClosestNodeTypeFromId(node.id, "StoryFragment");
          const storyFragment = cloneDeep(
            ctx.allNodes.get().get(storyFragmentId)
          ) as StoryFragmentNode;
          if (storyFragment) {
            storyFragment.paneIds = [...originalPaneIds];
            this.modifyNodes([{ ...storyFragment, isChanged: true }]);
          }
        }

        const parentNode = ctx.nodeToNotify(node?.parentId || "", node.nodeType);
        ctx.notifyNode(parentNode || "");
      },
      redo: (ctx) => {
        moveNodeAtLocationInContext(
          oldParentNodes,
          originalIdx,
          newLocationNode,
          insertNodeId,
          nodeId,
          location,
          node,
          ctx
        );

        if (node.nodeType === "Pane") {
          const storyFragmentId = ctx.getClosestNodeTypeFromId(node.id, "StoryFragment");
          const storyFragment = cloneDeep(
            ctx.allNodes.get().get(storyFragmentId)
          ) as StoryFragmentNode;
          if (storyFragment) {
            this.modifyNodes([{ ...storyFragment, isChanged: true }]);
          }
        }
      },
    });
  }

  getPaneImageFileIds(paneId: string): string[] {
    const paneNode = this.allNodes.get().get(paneId);
    if (!paneNode || paneNode.nodeType !== "Pane") return [];
    const allNodes = this.getNodesRecursively(paneNode);
    const fileNodes = allNodes
      .filter(
        (node): node is FlatNode =>
          node.nodeType === "TagElement" &&
          "tagName" in node &&
          node.tagName === "img" &&
          "fileId" in node &&
          typeof node.fileId === "string"
      )
      .map((node) => node.fileId)
      .filter((id): id is string => id !== undefined);
    return fileNodes;
  }

  getPaneImagesMap(): Record<string, string[]> {
    const paneNodes = Array.from(this.allNodes.get().values()).filter(
      (node): node is PaneNode => node.nodeType === "Pane"
    );
    const result: Record<string, string[]> = {};
    paneNodes.forEach((pane) => {
      const fileIds = this.getPaneImageFileIds(pane.id);
      if (fileIds.length > 0) {
        result[pane.id] = fileIds;
      }
    });
    return result;
  }

  insertPaneId(
    storyfragmentId: string,
    paneId: string,
    insertId?: string,
    location?: "before" | "after"
  ) {
    const storyfragment = this.allNodes.get().get(storyfragmentId) as StoryFragmentNode;
    if (!storyfragment || storyfragment.nodeType !== "StoryFragment") {
      console.warn("Invalid storyfragment ID in insertPaneId");
      return;
    }

    const oldPaneIds = [...storyfragment.paneIds];

    // If no insert reference, just append
    if (!insertId) {
      storyfragment.paneIds.push(paneId);
    } else {
      const insertIdx = storyfragment.paneIds.indexOf(insertId);
      if (insertIdx === -1) {
        console.warn("Insert reference pane not found in storyfragment");
        return;
      }

      const targetIdx = location === "before" ? insertIdx : insertIdx + 1;
      storyfragment.paneIds.splice(targetIdx, 0, paneId);
    }

    // Mark storyfragment as changed
    storyfragment.isChanged = true;

    // Add to history
    this.history.addPatch({
      op: PatchOp.REPLACE,
      undo: (ctx) => {
        const sf = ctx.allNodes.get().get(storyfragmentId) as StoryFragmentNode;
        if (sf) {
          sf.paneIds = oldPaneIds;
          sf.isChanged = true;
        }
      },
      redo: (ctx) => {
        const sf = ctx.allNodes.get().get(storyfragmentId) as StoryFragmentNode;
        if (sf) {
          sf.paneIds = [...storyfragment.paneIds];
          sf.isChanged = true;
        }
      },
    });
  }

  isSlugValid(slug: string, currentNodeId?: string): { isValid: boolean; error?: string } {
    // Early validation for empty slugs
    if (!slug || slug.length < 3) {
      return { isValid: false, error: "Slug must be at least 3 characters" };
    }
    // Check against reserved slugs
    if (reservedSlugs.includes(slug)) {
      return { isValid: false, error: "This URL is reserved and cannot be used" };
    }
    // Check if slug contains only valid characters (alphanumeric, hyphens)
    const validSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!validSlugPattern.test(slug)) {
      return {
        isValid: false,
        error: "Slug can only contain lowercase letters, numbers, and hyphens",
      };
    }
    // Check for duplicate slugs
    const nodes = Array.from(this.allNodes.get().values());
    const duplicateNode = nodes.find(
      (node) =>
        (node.nodeType === "StoryFragment" || node.nodeType === "Pane") &&
        "slug" in node &&
        node.slug === slug &&
        node.id !== currentNodeId
    );
    if (duplicateNode) {
      return {
        isValid: false,
        error: `This URL is already in use by ${duplicateNode.nodeType === "Pane" ? "pane" : "page"}: ${(duplicateNode as PaneNode).title}`,
      };
    }
    return { isValid: true };
  }

  generateValidSlug(title: string, currentNodeId?: string): string {
    // Convert title to lowercase and replace spaces/special chars with hyphens
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    // If the base slug is already valid and unique, use it
    if (this.isSlugValid(slug, currentNodeId)) {
      return slug;
    }
    // Otherwise, append numbers until we find a unique slug
    let counter = 1;
    let newSlug = slug;
    while (!this.isSlugValid(newSlug, currentNodeId)) {
      newSlug = `${slug}-${counter}`;
      counter++;
    }
    return newSlug;
  }

  private deleteNodes(nodesList: BaseNode[]): BaseNode[] {
    const deletedNodes: BaseNode[] = [];

    nodesList.forEach((node) => {
      if (!node) return;

      // Remove node
      const allNodes = this.allNodes.get();
      if (allNodes.delete(node.id)) {
        deletedNodes.push(node);
      }

      // Remove parent link
      if (node?.parentId !== null) {
        const parentNodes = this.parentNodes.get();
        const parentNode = parentNodes.get(node.parentId);
        if (parentNode) {
          parentNode.splice(parentNode.indexOf(node.id), 1);
          this.parentNodes.set(new Map<string, string[]>(parentNodes));
        }
      }
    });

    return deletedNodes;
  }
}

export const globalCtx: NodesContext = new NodesContext();

export const getCtx = (props?: NodeProps | ReactNodesRendererProps | WidgetProps): NodesContext => {
  return props?.ctx || globalCtx;
};
