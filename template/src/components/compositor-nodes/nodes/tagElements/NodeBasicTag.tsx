import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
import {
  type JSX,
  type RefObject,
  type FocusEvent,
  type MouseEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  useEffect,
  useRef,
  useState,
  createElement,
} from "react";
import { canEditText, processRichTextToNodes } from "@/utils/common/nodesHelper.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { NodeProps, FlatNode, PaneNode } from "@/types.ts";
import GhostText from "./GhostText";

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = (props: NodeTagProps) => {
  console.log(`Rendering NodeBasicTag with id: ${props.nodeId}`);
  const nodeId = props.nodeId;
  const editIntentRef = useRef<boolean>(false);
  const children = getCtx(props).getChildNodeIDs(props.nodeId);
  const originalTextRef = useRef<string>("");
  const elementRef = useRef<HTMLElement | null>(null);
  const doubleClickedRef = useRef<boolean>(false);
  const [showGhostText, setShowGhostText] = useState(false);
  const bypassEarlyReturnRef = useRef(false);
  const currentContentRef = useRef(originalTextRef.current);
  const cursorPosRef = useRef<{ node: Node; offset: number } | null>(null);
  const focusTransitionRef = useRef(false);
  const ghostTextRef = useRef<HTMLDivElement | null>(null);
  const Tag = props.tagName;
  const isEditableMode = [`default`, `text`].includes(getCtx(props).toolModeValStore.get().value);
  const supportsEditing = canEditText(props);

  useEffect(() => {
    if (showGhostText) {
      getCtx(props).setActiveGhost(nodeId);
    }
  }, [showGhostText]);

  useEffect(() => {
    if (!showGhostText) return;

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (focusTransitionRef.current) return;
      if (!isEditableMode || !supportsEditing) return;

      const mainElement = elementRef.current;
      const ghostElements = document.querySelectorAll("[data-ghost-text]");
      let clickedInsideGhost = false;

      for (let i = 0; i < ghostElements.length; i++) {
        if (ghostElements[i].contains(event.target as Node)) {
          clickedInsideGhost = true;
          break;
        }
      }

      if (mainElement && !mainElement.contains(event.target as Node) && !clickedInsideGhost) {
        setShowGhostText(false);
        editIntentRef.current = false;
        bypassEarlyReturnRef.current = true;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGhostText, isEditableMode, supportsEditing]);

  useEffect(() => {
    getCtx(props).clickedNodeId.subscribe((val) => {
      if (editIntentRef.current && val !== nodeId) {
        editIntentRef.current = false;
        originalTextRef.current = "";
      }
    });
  }, []);

  useEffect(() => {
    if (isEditableMode && editIntentRef.current && cursorPosRef.current && elementRef.current) {
      setTimeout(() => {
        restoreCursorPosition();
      }, 10);
    }
  });

  const restoreCursorPosition = () => {
    if (!cursorPosRef.current || !elementRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      const range = document.createRange();

      if (elementRef.current.contains(cursorPosRef.current.node)) {
        range.setStart(cursorPosRef.current.node, cursorPosRef.current.offset);
      } else {
        const walkTreeForTextNode = (node: Node): Node | null => {
          if (node.nodeType === Node.TEXT_NODE) return node;

          for (let i = 0; i < node.childNodes.length; i++) {
            const found = walkTreeForTextNode(node.childNodes[i]);
            if (found) return found;
          }

          return null;
        };

        const textNode = walkTreeForTextNode(elementRef.current);
        if (!textNode) return;

        const maxOffset = textNode.textContent?.length || 0;
        range.setStart(textNode, Math.min(cursorPosRef.current.offset, maxOffset));
      }

      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.error("Error restoring cursor position:", e);
    }

    if (!focusTransitionRef.current) {
      cursorPosRef.current = null;
    }
  };

  const handleInsertSignal = (tagName: string, nodeId: string) => {
    getCtx(props).handleInsertSignal(tagName, nodeId);
  };

  const handlePaste = (e: ClipboardEvent<HTMLElement>) => {
    editIntentRef.current = true;
    e.preventDefault();

    const text = e.clipboardData.getData("text/plain");

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const el = e.currentTarget;
      el.textContent = (el.textContent || "") + text;
    }
  };

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    // Early exit if text editing is not allowed or if the target is a button
    if (!canEditText(props) || e.target.tagName === "BUTTON") return;

    // Check where the focus is moving to
    const isFocusInGhostText = ghostTextRef.current?.contains(e.relatedTarget as Node);
    const isFocusInNode = elementRef.current?.contains(e.relatedTarget as Node);

    // Handle early return cases (e.g., double-click or no edit intent)
    if (doubleClickedRef.current || (!editIntentRef.current && !bypassEarlyReturnRef.current)) {
      doubleClickedRef.current = false;
      editIntentRef.current = false;

      // Hide GhostText if focus moves outside both the node and its GhostText
      if (!isFocusInNode && !isFocusInGhostText) {
        setShowGhostText(false);
      }
      return;
    }

    // Get the current node and new content
    const node = getCtx(props).allNodes.get().get(nodeId);
    const newHTML = currentContentRef.current;

    // Reset edit intent if not in a focus transition
    if (!focusTransitionRef.current) editIntentRef.current = false;

    // If content hasn’t changed, notify parent and show GhostText if appropriate
    if (newHTML === originalTextRef.current) {
      //getCtx(props).notifyNode(node?.parentId || "");
      //console.log(`notify ... no change`,node?.parentId);
      if (isEditableMode && supportsEditing && !showGhostText && !focusTransitionRef.current) {
        setShowGhostText(true);
      }
      return;
    }

    // Process and save the new content
    try {
      const originalNodes = getCtx(props)
        .getNodesRecursively(node)
        .filter(
          (childNode): childNode is FlatNode =>
            "tagName" in childNode && ["a", "button"].includes(childNode.tagName as string)
        ) as FlatNode[];

      const parsedNodes = processRichTextToNodes(
        newHTML,
        nodeId,
        originalNodes,
        handleInsertSignal
      );

      if (parsedNodes.length > 0) {
        getCtx(props).deleteChildren(nodeId);
        getCtx(props).addNodes(parsedNodes);

        const paneNodeId = getCtx(props).getClosestNodeTypeFromId(nodeId, "Pane");
        if (paneNodeId) {
          const paneNode = cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)) as PaneNode;
          getCtx(props).modifyNodes([{ ...paneNode, isChanged: true }]);
        }
      }

      // Show GhostText if in editable mode and editing is supported
      if (isEditableMode && supportsEditing) setShowGhostText(true);
    } catch (error) {
      console.error("Error parsing edited content:", error);
      getCtx(props).notifyNode(node?.parentId || "");
    }

    // Final check to hide GhostText if focus moves outside
    if (!isFocusInNode && !isFocusInGhostText) {
      setShowGhostText(false);
    }
  };

  const getGhostTextElement = (): HTMLElement | null => {
    const element = document.querySelector(
      '[data-ghost-text="placeholder"], [data-ghost-text="true"]'
    );
    if (element && element instanceof HTMLDivElement) {
      ghostTextRef.current = element;
      return element;
    }
    return null;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    editIntentRef.current = true;

    if (e.key === "Enter") {
      e.preventDefault();
      if (elementRef.current) {
        currentContentRef.current = elementRef.current.innerHTML;
      }
      handleBlur(e as unknown as FocusEvent<HTMLElement>);
    } else if (e.key === "Tab") {
      e.preventDefault();

      focusTransitionRef.current = true;

      if (!showGhostText) {
        setShowGhostText(true);

        setTimeout(() => {
          const ghostElement = getGhostTextElement();
          if (ghostElement && "activate" in ghostElement) {
            (ghostElement as any).activate();
          }
        }, 50);
      } else {
        const ghostElement = getGhostTextElement();
        if (ghostElement && "activate" in ghostElement) {
          (ghostElement as any).activate();
        }
      }
    }
  };

  const handleFocus = (e: FocusEvent) => {
    if (!canEditText(props) || e.target.tagName === "BUTTON") {
      return;
    }

    originalTextRef.current = e.currentTarget.innerHTML;

    if (isEditableMode && supportsEditing) {
      setShowGhostText(true);
    }

    if (cursorPosRef.current) {
      restoreCursorPosition();
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    getCtx(props).setClickedNodeId(nodeId);
    e.stopPropagation();
  };

  const handleClick = () => {
    if (!isEditableMode || !supportsEditing) return;
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection) {
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          cursorPosRef.current = {
            node: range.startContainer,
            offset: range.startOffset,
          };
        }
      }
    }, 0);
    editIntentRef.current = true;
  };

  const handleDoubleClick = (e: MouseEvent) => {
    doubleClickedRef.current = true;
    editIntentRef.current = false;

    if (elementRef.current) {
      elementRef.current.blur();
    }

    getCtx(props).setClickedNodeId(nodeId, true);
    e.stopPropagation();
  };

  const handleGhostContentSaved = () => {
    // Mimic handleBlur's full save logic after GhostText commits
    if (!canEditText(props)) return;

    // Ensure we have the latest content
    if (elementRef.current) {
      currentContentRef.current = elementRef.current.innerHTML;
    }

    const node = getCtx(props).allNodes.get().get(nodeId);
    const newHTML = currentContentRef.current;

    // If no changes, just notify parent and exit
    if (newHTML === originalTextRef.current) {
      //getCtx(props).notifyNode(node?.parentId || "");
      //console.log(`notify ... change`,node?.parentId);
      return;
    }

    try {
      // Get existing nodes to preserve (e.g., <a>, <button>)
      const originalNodes = getCtx(props)
        .getNodesRecursively(node)
        .filter(
          (childNode): childNode is FlatNode =>
            "tagName" in childNode && ["a", "button"].includes(childNode.tagName as string)
        ) as FlatNode[];

      // Parse the new HTML into nodes
      const parsedNodes = processRichTextToNodes(
        newHTML,
        nodeId,
        originalNodes,
        handleInsertSignal
      );

      if (parsedNodes.length > 0) {
        // Replace existing children with parsed nodes
        getCtx(props).deleteChildren(nodeId);
        getCtx(props).addNodes(parsedNodes);

        // Mark the parent PaneNode as changed
        const paneNodeId = getCtx(props).getClosestNodeTypeFromId(nodeId, "Pane");
        if (paneNodeId) {
          const paneNode = cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)) as PaneNode;
          getCtx(props).modifyNodes([{ ...paneNode, isChanged: true }]);
        }
      }

      // Notify parent to ensure consistency
      console.log(`notify ... change`, node?.parentId);
      getCtx(props).notifyNode(node?.parentId || "");
    } catch (error) {
      console.error("Error parsing edited content in handleGhostContentSaved:", error);
      getCtx(props).notifyNode(node?.parentId || "");
    }
  };

  const handleGhostComplete = () => {
    setShowGhostText(false);
    focusTransitionRef.current = false;

    if (getCtx(props).ghostTextActiveId.get() === nodeId) {
      getCtx(props).ghostTextActiveId.set("");
    }
  };

  if (showGuids.get()) {
    return (
      <div
        ref={elementRef as RefObject<HTMLDivElement>}
        className={getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <RenderChildren children={children} nodeProps={props} />
      </div>
    );
  }

  return (
    <>
      {createElement(
        Tag,
        {
          ref: elementRef,
          className: getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value),
          contentEditable: isEditableMode,
          suppressContentEditableWarning: true,
          onPaste: handlePaste,
          onBlur: handleBlur,
          onMouseDown: handleMouseDown,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
          onFocus: handleFocus,
          onDoubleClick: handleDoubleClick,
          onInput: () => {
            editIntentRef.current = true;
            if (elementRef.current) {
              currentContentRef.current = elementRef.current.innerHTML;
            }
          },
        },
        <RenderChildren children={children} nodeProps={props} />
      )}

      {showGhostText && isEditableMode && supportsEditing && (
        <GhostText
          parentId={nodeId}
          onComplete={handleGhostComplete}
          onContentSaved={handleGhostContentSaved}
          onActivate={() => {
            focusTransitionRef.current = false;
            editIntentRef.current = false;
          }}
          ctx={props.ctx}
          ref={ghostTextRef}
        />
      )}
    </>
  );
};
