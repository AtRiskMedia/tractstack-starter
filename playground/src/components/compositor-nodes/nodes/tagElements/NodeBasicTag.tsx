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
import { canEditText, parseMarkdownToNodes } from "@/utils/common/nodesHelper.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { PatchOp } from "@/store/nodesHistory.ts";
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

  const getNodeText = (node: FlatNode, ctx = getCtx(props)): string => {
    if (node.copy) return node.copy;

    // Get text from child nodes
    const childIds = ctx.getChildNodeIDs(node.id);
    if (childIds.length === 0) return "";

    return childIds
      .map((id) => {
        const childNode = ctx.allNodes.get().get(id) as FlatNode;
        if (!childNode) return "";
        return getNodeText(childNode, ctx);
      })
      .join(" ")
      .trim();
  };

  const findMatchingNode = (newNode: FlatNode, originalNodes: FlatNode[]): FlatNode | undefined => {
    // Handle links with href
    if (newNode.tagName === "a" && newNode.href) {
      // First try to match by href exactly
      const hrefMatch = originalNodes.find(
        (node) => node.tagName === "a" && node.href === newNode.href
      );
      if (hrefMatch) return hrefMatch;

      // Try to match by domain
      const partialMatch = originalNodes.find((node) => {
        if (node.tagName !== "a" || !node.href || !newNode.href) return false;

        try {
          const origDomain = new URL(node.href).hostname;
          const newDomain = new URL(newNode.href).hostname;
          return origDomain === newDomain;
        } catch {
          return false;
        }
      });

      if (partialMatch) return partialMatch;
    }

    // Handle buttons - for buttons we need to compare by content and position
    if (newNode.tagName === "button") {
      // Get the text content of the new button
      const newText = getNodeText(newNode);

      // Find buttons in the original nodes and compare their text
      const buttonMatches = originalNodes.filter((node) => node.tagName === "button");

      for (const button of buttonMatches) {
        const buttonText = getNodeText(button);

        // Text content can change slightly, so use similarity instead of exact match
        // If one text contains the other, or they're at least 70% similar, consider it a match
        if (
          buttonText.includes(newText) ||
          newText.includes(buttonText) ||
          calculateSimilarity(buttonText, newText) > 0.7
        ) {
          return button;
        }
      }

      // If still no match but we only have one button in the original content
      // and one in the new content, assume they're the same
      if (
        buttonMatches.length === 1 &&
        originalNodes.filter((n) => n.tagName === "button").length === 1
      ) {
        return buttonMatches[0];
      }
    }

    return undefined;
  };

  // Helper function to calculate text similarity (0-1 where 1 is identical)
  const calculateSimilarity = (a: string, b: string): number => {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    // Simple similarity - count common characters
    const aChars = new Set(a.toLowerCase());
    const bChars = new Set(b.toLowerCase());

    const intersection = new Set([...aChars].filter((x) => bChars.has(x)));
    const union = new Set([...aChars, ...bChars]);

    return intersection.size / union.size;
  };

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    // Skip processing if not in edit mode or element is a button
    if (!canEditText(props) || e.target.tagName === "BUTTON") {
      return;
    }

    // Skip if double-clicked (handled separately) or no edit intent
    if (doubleClickedRef.current || !editIntentRef.current) {
      doubleClickedRef.current = false;
      editIntentRef.current = false;
      return;
    }

    const node = getCtx(props).allNodes.get().get(nodeId);

    // Handle content processing regardless of focus transition state
    const newHTML = e.currentTarget.innerHTML;

    // Keep edit intent if we're transitioning to ghost text
    if (!focusTransitionRef.current) {
      editIntentRef.current = false;
    }

    // No change, no need to process content
    if (newHTML === originalTextRef.current) {
      getCtx(props).notifyNode(node?.parentId || "");

      // Only show ghost text if not already in a focus transition
      if (isEditableMode && supportsEditing && !showGhostText && !focusTransitionRef.current) {
        setShowGhostText(true);
      }
      return;
    }

    try {
      // Get all interactive elements from the original structure before parsing
      const originalNodes = getCtx(props).getNodesRecursively(node);
      const originalInteractiveNodes = originalNodes
        .filter(
          (childNode) =>
            "tagName" in childNode &&
            typeof childNode.tagName === `string` &&
            [`a`, `button`].includes(childNode.tagName)
        )
        .map((childNode) => childNode as FlatNode);

      // Parse the new HTML
      const parsedNodes = parseMarkdownToNodes(newHTML, nodeId);

      if (parsedNodes && parsedNodes.length > 0) {
        // Delete the existing children
        const deletedNodes = getCtx(props).deleteChildren(nodeId);

        // Process each node to restore styling and callbacks
        parsedNodes.forEach((node: FlatNode) => {
          if ([`a`, `button`].includes(node.tagName)) {
            // Try to find a matching original interactive element
            const matchingOriginalNode = findMatchingNode(node, originalInteractiveNodes);

            if (matchingOriginalNode) {
              // Preserve buttonPayload for styling and functionality
              node.buttonPayload = matchingOriginalNode.buttonPayload;
              // Make sure href is preserved for <a> tags
              if (node.tagName === "a" && matchingOriginalNode.href) {
                node.href = matchingOriginalNode.href;
              }
            } else {
              // This is a new interactive element, flag it for configuration
              setTimeout(() => handleInsertSignal(node.tagName, node.id), 0);
            }
          }
        });

        // Add the new node structure
        getCtx(props).addNodes(parsedNodes);

        // Mark the parent pane as changed
        const paneNodeId = getCtx(props).getClosestNodeTypeFromId(nodeId, "Pane");
        if (paneNodeId) {
          const paneNode = {
            ...cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)),
            isChanged: true,
          } as PaneNode;
          getCtx(props).modifyNodes([paneNode]);
        }

        // Add undo/redo capability
        getCtx(props).history.addPatch({
          op: PatchOp.REPLACE,
          undo: (ctx) => {
            ctx.deleteChildren(nodeId);
            ctx.addNodes(deletedNodes);
            const paneNodeId = getCtx(props).getClosestNodeTypeFromId(nodeId, "Pane");
            if (paneNodeId) {
              const paneNode = {
                ...cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)),
                isChanged: true,
              } as PaneNode;
              getCtx(props).modifyNodes([paneNode]);
            }
          },
          redo: (ctx) => {
            ctx.deleteChildren(nodeId);
            ctx.addNodes(parsedNodes);
            const paneNodeId = getCtx(props).getClosestNodeTypeFromId(nodeId, "Pane");
            if (paneNodeId) {
              const paneNode = {
                ...cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)),
                isChanged: true,
              } as PaneNode;
              getCtx(props).modifyNodes([paneNode]);
            }
          },
        });
      }

      // Show ghost text after editing is complete
      if (isEditableMode && supportsEditing) {
        setShowGhostText(true);
      }
    } catch (error) {
      console.error("Error parsing edited content:", error);
      // Notify the parent node of the error
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
  };

  const handleMouseDown = (e: MouseEvent) => {
    // Just set the node as clicked, but don't yet mark as being edited
    // (that happens on keypress or focus+click)
    getCtx(props).setClickedNodeId(nodeId);
    e.stopPropagation();
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
          onKeyDown: handleKeyDown,
          onFocus: handleFocus,
          onDoubleClick: handleDoubleClick,
          // Mouse events that could indicate editing intent
          onInput: () => {
            editIntentRef.current = true;
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
