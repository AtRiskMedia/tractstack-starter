import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { isEditingStore } from "@/store/help";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import {
  type JSX,
  type FocusEvent,
  type MouseEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  useEffect,
  useRef,
  useState,
  createElement,
} from "react";
import { processRichTextToNodes, getTemplateNode } from "@/utils/common/nodesHelper.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { NodeProps, FlatNode, PaneNode } from "@/types.ts";
import TabIndicator from "./TabIndicator";

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

type EditState = "viewing" | "editing";
const VERBOSE = false;

export const NodeBasicTag = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const Tag = props.tagName;
  const ctx = getCtx(props);

  // Core state
  const [editState, setEditState] = useState<EditState>("viewing");
  const [showTabIndicator, setShowTabIndicator] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const originalContentRef = useRef<string>("");
  const cursorPositionRef = useRef<{ node: Node; offset: number } | null>(null);

  // Get node data
  const node = ctx.allNodes.get().get(nodeId) as FlatNode;
  const children = ctx.getChildNodeIDs(nodeId);
  const isEditableMode = ctx.toolModeValStore.get().value === "text";
  const supportsEditing = !["ol", "ul"].includes(props.tagName);
  const isPlaceholder = node?.isPlaceholder === true;
  const isEmpty = elementRef.current?.textContent?.trim() === "";

  // Auto-enter edit mode for new placeholder nodes
  useEffect(() => {
    if (isPlaceholder && isEditableMode && supportsEditing && editState === "viewing") {
      if (VERBOSE)
        console.log(`[NodeBasicTag] Auto-entering edit mode for placeholder nodeId: ${nodeId}`);
      setEditState("editing");
      if (elementRef.current) {
        elementRef.current.focus();
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          const textNode = findFirstTextNode(elementRef.current) || elementRef.current;
          range.setStart(textNode, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          if (VERBOSE)
            console.log(
              `[NodeBasicTag] Set cursor for nodeId: ${nodeId}, contentEditable: ${elementRef.current.contentEditable}, activeElement: ${document.activeElement === elementRef.current}`
            );
        } else {
          console.warn(`[NodeBasicTag] No selection available for nodeId: ${nodeId}`);
        }
      } else {
        console.warn(`[NodeBasicTag] elementRef not ready for nodeId: ${nodeId}`);
      }
    }
  }, [isPlaceholder, isEditableMode, supportsEditing, nodeId]);

  // Sync edit state with global store
  useEffect(() => {
    isEditingStore.set(editState === "editing");
    return () => {
      if (editState === "editing") {
        isEditingStore.set(false);
      }
    };
  }, [editState]);

  // Set edit lock when editing
  useEffect(() => {
    if (editState === "editing") {
      ctx.setEditLock(nodeId);
      setShowTabIndicator(true);
    } else {
      if (ctx.isEditLocked(nodeId)) {
        ctx.clearEditLock();
      }
      setShowTabIndicator(false);
    }
  }, [editState, nodeId]);

  // Auto-delete empty placeholder on blur
  useEffect(() => {
    if (editState === "viewing" && isPlaceholder && isEmpty && !ctx.isEditLocked(nodeId)) {
      const timer = setTimeout(() => {
        if (elementRef.current?.textContent?.trim() === "" && !ctx.isEditLocked(nodeId)) {
          if (VERBOSE) console.log(`[NodeBasicTag] Deleting empty placeholder nodeId: ${nodeId}`);
          ctx.deleteNode(nodeId);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editState, isPlaceholder, isEmpty, nodeId]);

  // Helper functions for text nodes
  const findFirstTextNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node;
    for (let i = 0; i < node.childNodes.length; i++) {
      const found = findFirstTextNode(node.childNodes[i]);
      if (found) return found;
    }
    return null;
  };

  const findLastTextNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node;
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const found = findLastTextNode(node.childNodes[i]);
      if (found) return found;
    }
    return null;
  };

  // Restore cursor position
  const restoreCursorPosition = () => {
    if (!cursorPositionRef.current || !elementRef.current) return;

    const selection = window.getSelection();
    if (!selection) {
      console.warn(
        `[NodeBasicTag] No selection available for cursor restoration in nodeId: ${nodeId}`
      );
      return;
    }

    try {
      const range = document.createRange();
      const { node, offset } = cursorPositionRef.current;

      if (elementRef.current.contains(node)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const maxOffset = node.textContent?.length || 0;
          range.setStart(node, Math.min(offset, maxOffset));
        } else {
          const maxOffset = node.childNodes.length;
          range.setStart(node, Math.min(offset, maxOffset));
        }
      } else {
        const textNode = findFirstTextNode(elementRef.current);
        if (textNode) {
          range.setStart(textNode, 0);
        } else {
          range.setStart(elementRef.current, 0);
        }
      }

      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      if (VERBOSE) console.log(`[NodeBasicTag] Cursor restored for nodeId: ${nodeId}`);
    } catch (e) {
      console.warn(`[NodeBasicTag] Cursor restoration failed for nodeId: ${nodeId}:`, e);
      if (elementRef.current) {
        elementRef.current.focus();
      }
    }

    cursorPositionRef.current = null;
  };

  // Apply cursor position when entering edit mode
  useEffect(() => {
    if (editState === "editing" && elementRef.current && cursorPositionRef.current) {
      requestAnimationFrame(() => {
        restoreCursorPosition();
      });
    }
  }, [editState]);

  // For formatting nodes and interactive elements like <a> and <button>
  if (["em", "strong", "a", "button"].includes(props.tagName)) {
    return createElement(
      Tag,
      {
        className: ctx.getNodeClasses(nodeId, viewportKeyStore.get().value),
        onClick: (e: MouseEvent) => {
          if (isEditableMode) {
            ctx.setClickedNodeId(nodeId);
          } else {
            ctx.setClickedNodeId(nodeId);
            e.stopPropagation();
          }
        },
        "data-node-id": nodeId,
        tabIndex: isEditableMode ? -1 : undefined,
      },
      <RenderChildren children={children} nodeProps={props} />
    );
  }

  const startEditing = () => {
    if (!isEditableMode || !supportsEditing || editState === "editing") return;

    originalContentRef.current = elementRef.current?.innerHTML || "";
    setEditState("editing");
    if (VERBOSE) console.log(`[NodeBasicTag] Started editing nodeId: ${nodeId}`);
  };

  const handleInsertSignal = (tagName: string, nodeId: string) => {
    setTimeout(() => {
      ctx.handleInsertSignal(tagName, nodeId);
    }, 50);
  };

  const saveAndExit = () => {
    if (editState !== "editing") return;

    const currentContent = elementRef.current?.innerHTML || "";

    if (currentContent !== originalContentRef.current) {
      try {
        const originalNodes = ctx
          .getNodesRecursively(node)
          .filter(
            (childNode): childNode is FlatNode =>
              "tagName" in childNode && ["a", "button"].includes(childNode.tagName as string)
          ) as FlatNode[];

        const parsedNodes = processRichTextToNodes(
          currentContent,
          nodeId,
          originalNodes,
          handleInsertSignal
        );

        if (parsedNodes.length > 0) {
          ctx.deleteChildren(nodeId);
          ctx.addNodes(parsedNodes);

          if (isPlaceholder) {
            const updatedNode = {
              ...cloneDeep(node),
              isPlaceholder: false,
              isChanged: true,
            };
            ctx.modifyNodes([updatedNode]);
          }

          const paneNodeId = ctx.getClosestNodeTypeFromId(nodeId, "Pane");
          if (paneNodeId) {
            const paneNode = cloneDeep(ctx.allNodes.get().get(paneNodeId)) as PaneNode;
            ctx.modifyNodes([{ ...paneNode, isChanged: true }]);
          }
        }
      } catch (error) {
        console.error(`[NodeBasicTag] Error saving content for nodeId: ${nodeId}:`, error);
      }
    }

    setEditState("viewing");
    if (VERBOSE) console.log(`[NodeBasicTag] Exited editing for nodeId: ${nodeId}`);

    // Check if content is empty and delete the node if it is
    if (elementRef.current?.textContent?.trim() === "") {
      if (VERBOSE) console.log(`[NodeBasicTag] Deleting empty nodeId: ${nodeId}`);
      ctx.deleteNode(nodeId);
    }
  };

  const createNextParagraph = () => {
    if (VERBOSE) console.log(`[NodeBasicTag] Creating next paragraph after nodeId: ${nodeId}`);

    const currentContent = elementRef.current?.innerHTML || "";

    if (currentContent !== originalContentRef.current) {
      try {
        const originalNodes = ctx
          .getNodesRecursively(node)
          .filter(
            (childNode): childNode is FlatNode =>
              "tagName" in childNode && ["a", "button"].includes(childNode.tagName as string)
          ) as FlatNode[];

        const parsedNodes = processRichTextToNodes(
          currentContent,
          nodeId,
          originalNodes,
          handleInsertSignal
        );

        if (parsedNodes.length > 0) {
          ctx.deleteChildren(nodeId);
          ctx.addNodes(parsedNodes);

          if (isPlaceholder) {
            const updatedNode = {
              ...cloneDeep(node),
              isPlaceholder: false,
              isChanged: true,
            };
            ctx.modifyNodes([updatedNode]);
          }
        }
      } catch (error) {
        console.error(`[NodeBasicTag] Error saving content for nodeId: ${nodeId}:`, error);
      }
    }

    const paneNodeId = ctx.getClosestNodeTypeFromId(nodeId, "Pane");
    if (paneNodeId) {
      const paneNode = cloneDeep(ctx.allNodes.get().get(paneNodeId)) as PaneNode;
      ctx.modifyNodes([{ ...paneNode, isChanged: true }]);
    }

    ctx.clearEditLock();
    setEditState("viewing");

    const templateNode = getTemplateNode("p");
    const newNode = {
      ...templateNode,
      isPlaceholder: true,
    };
    if (newNode?.nodes?.length) {
      const firstNode = newNode.nodes.at(0);
      if (firstNode && typeof firstNode.copy === "string") {
        firstNode.copy = "";
      }
    }

    const newNodeId = ctx.addTemplateNode(nodeId, newNode, nodeId, "after");
    if (VERBOSE) console.log(`[NodeBasicTag] New paragraph created with id: ${newNodeId}`);

    if (newNodeId) {
      ctx.setEditLock(newNodeId);
      const attemptFocus = (attempts = 5, delay = 50) => {
        const newElement = document.querySelector(`[data-node-id="${newNodeId}"]`) as HTMLElement;
        if (newElement) {
          if (newElement.contentEditable === "true") {
            newElement.focus();
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              const textNode = findFirstTextNode(newElement) || newElement;
              range.setStart(textNode, 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            if (document.activeElement === newElement) {
              if (VERBOSE) console.log(`[NodeBasicTag] Successfully focused nodeId: ${newNodeId}`);
            } else {
              console.warn(
                `[NodeBasicTag] Focus failed for nodeId: ${newNodeId}, contentEditable: ${newElement.contentEditable}, activeElement: ${document.activeElement?.getAttribute("data-node-id")}`
              );
            }
          } else if (attempts > 0) {
            if (VERBOSE)
              console.log(
                `[NodeBasicTag] Element ${newNodeId} not yet editable, retrying. Attempts left: ${attempts}`
              );
            setTimeout(() => attemptFocus(attempts - 1, delay), delay);
          } else {
            console.error(
              `[NodeBasicTag] Failed to focus nodeId: ${newNodeId}, not editable after retries`
            );
          }
        } else if (attempts > 0) {
          if (VERBOSE)
            console.log(
              `[NodeBasicTag] Element ${newNodeId} not found, retrying. Attempts left: ${attempts}`
            );
          setTimeout(() => attemptFocus(attempts - 1, delay), delay);
        } else {
          console.error(
            `[NodeBasicTag] Failed to find element for nodeId: ${newNodeId} after retries`
          );
        }
      };
      requestAnimationFrame(() => attemptFocus());
    }
  };

  // Event Handlers
  const handleFocus = () => {
    if (!supportsEditing) return;
    startEditing();
  };

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (VERBOSE) console.log(`[NodeBasicTag] Blur event, relatedTarget:`, e.relatedTarget);
    if (
      relatedTarget?.hasAttribute("data-tab-indicator") ||
      (relatedTarget && elementRef.current?.contains(relatedTarget))
    ) {
      return;
    }
    saveAndExit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (editState !== "editing") return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveAndExit();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      createNextParagraph();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (elementRef.current && originalContentRef.current) {
        elementRef.current.innerHTML = originalContentRef.current;
      }
      setEditState("viewing");
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLElement>) => {
    if (editState !== "editing") return;

    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleClick = (e: MouseEvent) => {
    if (
      isEditableMode &&
      (e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement)
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isEditableMode && supportsEditing && editState === "viewing") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (elementRef.current?.contains(range.commonAncestorContainer)) {
          cursorPositionRef.current = {
            node: range.startContainer,
            offset: range.startOffset,
          };
        } else if (elementRef.current) {
          const textNode =
            findLastTextNode(elementRef.current) || findFirstTextNode(elementRef.current);
          if (textNode) {
            cursorPositionRef.current = {
              node: textNode,
              offset: textNode.textContent?.length || 0,
            };
          }
        }
      }
      startEditing();
      if (elementRef.current) {
        elementRef.current.contentEditable = "true";
        elementRef.current.focus();
        requestAnimationFrame(() => {
          restoreCursorPosition();
          if (elementRef.current && document.activeElement !== elementRef.current) {
            console.warn(`[NodeBasicTag] Focus lost after click for nodeId: ${nodeId}, retrying`);
            elementRef.current.focus();
          }
        });
        setTimeout(() => {
          if (elementRef.current && document.activeElement !== elementRef.current) {
            elementRef.current.focus();
          }
        }, 0);
      }
    }
    ctx.setClickedNodeId(nodeId);
    if (!(e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement)) {
      e.stopPropagation();
    }
  };

  const handleDoubleClick = (e: MouseEvent) => {
    if (!isEditableMode) {
      ctx.setClickedNodeId(nodeId, true);
    }
    e.stopPropagation();
  };

  // Determine classes
  const baseClasses = ctx.getNodeClasses(nodeId, viewportKeyStore.get().value);
  const editingClasses =
    editState === "editing" ? "outline-2 outline-cyan-500 outline-offset-2" : "";
  const className = `${baseClasses} ${editingClasses}`.trim();

  return (
    <>
      {createElement(
        Tag,
        {
          ref: elementRef,
          className,
          contentEditable: editState === "editing",
          suppressContentEditableWarning: true,
          onFocus: handleFocus,
          onBlur: handleBlur,
          onKeyDown: handleKeyDown,
          onPaste: handlePaste,
          onClick: handleClick,
          onDoubleClick: handleDoubleClick,
          style: {
            cursor: isEditableMode && supportsEditing ? "text" : "default",
            minHeight: isPlaceholder ? "1.5em" : undefined,
          },
          "data-node-id": nodeId,
          "data-placeholder": isPlaceholder,
        },
        <RenderChildren children={children} nodeProps={props} />
      )}
      {showTabIndicator && editState === "editing" && (
        <TabIndicator onTab={createNextParagraph} parentNodeId={nodeId} />
      )}
    </>
  );
};
