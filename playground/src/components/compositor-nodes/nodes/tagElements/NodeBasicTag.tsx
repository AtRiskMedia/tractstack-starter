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
  const nodeId = props.nodeId;
  const editIntentRef = useRef<boolean>(false);
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));
  const originalTextRef = useRef<string>("");
  const elementRef = useRef<HTMLElement | null>(null);
  const doubleClickedRef = useRef<boolean>(false);
  const [showGhostText, setShowGhostText] = useState(false);
  const bypassEarlyReturnRef = useRef(false);
  const currentContentRef = useRef(originalTextRef.current);
  const cursorPosRef = useRef<{ node: Node; offset: number } | null>(null);

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

      // If clicked outside both elements and ghost text is showing, hide it
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
    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      setChildren(getCtx(props).getChildNodeIDs(nodeId));
    });

    getCtx(props).clickedNodeId.subscribe((val) => {
      if (editIntentRef.current && val !== nodeId) {
        editIntentRef.current = false;
        originalTextRef.current = "";
      }
    });

    return unsubscribe;
  }, []);

  // Effect to restore cursor position after component updates in Chrome
  useEffect(() => {
    if (isEditableMode && editIntentRef.current && cursorPosRef.current && elementRef.current) {
      // Use a slight delay to ensure DOM has updated
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
      // Create a new range at the stored position
      const range = document.createRange();

      // If we have a reference to the exact node, use it
      if (elementRef.current.contains(cursorPosRef.current.node)) {
        // The node still exists in the DOM
        range.setStart(cursorPosRef.current.node, cursorPosRef.current.offset);
      } else {
        // Find the first text node as fallback
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

        // Use the same relative position or the end of the text
        const maxOffset = textNode.textContent?.length || 0;
        range.setStart(textNode, Math.min(cursorPosRef.current.offset, maxOffset));
      }

      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.error("Error restoring cursor position:", e);
      // Silently fail if there's an issue with setting the selection
    }

    // Clear the saved position after attempting to restore it
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

    // Get plain text from clipboard
    const text = e.clipboardData.getData("text/plain");

    // Insert text at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      // Move cursor to end of inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback if selection API is not working
      const el = e.currentTarget;
      el.textContent = (el.textContent || "") + text;
    }
  };

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    if (!canEditText(props) || e.target.tagName === "BUTTON") return;
    if (doubleClickedRef.current || (!editIntentRef.current && !bypassEarlyReturnRef.current)) {
      doubleClickedRef.current = false;
      editIntentRef.current = false;
      return;
    }

    const node = getCtx(props).allNodes.get().get(nodeId);
    const newHTML = currentContentRef.current;

    if (!focusTransitionRef.current) editIntentRef.current = false;
    if (newHTML === originalTextRef.current) {
      getCtx(props).notifyNode(node?.parentId || "");
      if (isEditableMode && supportsEditing && !showGhostText && !focusTransitionRef.current) {
        setShowGhostText(true);
      }
      return;
    }

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

      if (isEditableMode && supportsEditing) setShowGhostText(true);
    } catch (error) {
      console.error("Error parsing edited content:", error);
      getCtx(props).notifyNode(node?.parentId || "");
    }
  };

  // Ref to track intentional focus transitions
  const focusTransitionRef = useRef(false);
  const ghostTextRef = useRef<HTMLElement | null>(null);

  // Function to find and get a reference to the ghost text element
  const getGhostTextElement = (): HTMLElement | null => {
    const element = document.querySelector(
      '[data-ghost-text="placeholder"], [data-ghost-text="true"]'
    );
    if (element && element instanceof HTMLElement) {
      ghostTextRef.current = element;
      return element;
    }
    return null;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Mark as being edited on any keypress
    editIntentRef.current = true;

    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur(e as unknown as FocusEvent<HTMLElement>); // Type casting to simulate blur event
    }
    // Handle Tab key to navigate to ghost text
    else if (e.key === "Tab") {
      e.preventDefault();

      // Set the transition flag to prevent ghost text from disappearing on blur
      focusTransitionRef.current = true;

      // Make sure ghost text is visible
      if (!showGhostText) {
        setShowGhostText(true);

        // Need to wait for ghost text to be rendered
        setTimeout(() => {
          const ghostElement = getGhostTextElement();
          if (ghostElement && "activate" in ghostElement) {
            (ghostElement as any).activate();
          }
        }, 50);
      } else {
        // Ghost text is already visible, focus and activate it
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

    // Save original HTML for comparison, but don't mark as editing yet
    // (wait for actual keypress or paste action)
    originalTextRef.current = e.currentTarget.innerHTML;

    // Show ghost text as soon as the element receives focus
    if (isEditableMode && supportsEditing) {
      setShowGhostText(true);
    }

    // Try to restore cursor position if we had one saved
    if (cursorPosRef.current) {
      restoreCursorPosition();
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    // Set the node as clicked
    getCtx(props).setClickedNodeId(nodeId);
    e.stopPropagation();
  };

  // Capture cursor position after click (works in Chrome)
  const handleClick = () => {
    if (!isEditableMode || !supportsEditing) return;
    // Only try to capture cursor position in Chrome
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
    // Mark as double-clicked to prevent blur handler from processing
    doubleClickedRef.current = true;
    editIntentRef.current = false;

    // Immediately blur to exit contentEditable mode
    if (elementRef.current) {
      elementRef.current.blur();
    }

    // Trigger double-click handling
    getCtx(props).setClickedNodeId(nodeId, true);
    e.stopPropagation();
  };

  // Handle ghost text completion
  const handleGhostComplete = () => {
    // Ensure we clear ghostText state first
    setShowGhostText(false);
    focusTransitionRef.current = false;

    // Only clear the active ghost ID if it matches this component
    // This prevents race conditions when switching between components
    if (getCtx(props).ghostTextActiveId.get() === nodeId) {
      getCtx(props).ghostTextActiveId.set("");
    }
  };

  // For development/debugging with GUIDs visible
  if (showGuids.get()) {
    return (
      <>
        <div
          ref={elementRef as RefObject<HTMLDivElement>}
          className={getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          <RenderChildren children={children} nodeProps={props} />
        </div>

        {showGhostText && isEditableMode && supportsEditing && (
          <GhostText parentId={nodeId} onComplete={handleGhostComplete} ctx={props.ctx} />
        )}
      </>
    );
  }

  // Regular rendering
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
          // Mouse events that could indicate editing intent
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
          onActivate={() => {
            // When ghost text is activated, reset the transition flag
            focusTransitionRef.current = false;
            // No longer editing the main content
            editIntentRef.current = false;
          }}
          ctx={props.ctx}
        />
      )}
    </>
  );
};
