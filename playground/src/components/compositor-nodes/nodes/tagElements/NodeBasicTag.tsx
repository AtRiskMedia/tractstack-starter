import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
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
import { canEditText, processRichTextToNodes } from "@/utils/common/nodesHelper.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { NodeProps, FlatNode, PaneNode } from "@/types.ts";
import GhostText from "./GhostText";

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = (props: NodeTagProps) => {
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
  const isEditableMode = [`text`].includes(getCtx(props).toolModeValStore.get().value);
  const supportsEditing = canEditText(props);

  useEffect(() => {
    const unsubscribe = getCtx(props).ghostTextActiveId.subscribe((activeId) => {
      if (activeId !== nodeId) {
        setShowGhostText(false);
      }
    });
    return () => unsubscribe();
  }, [nodeId]);

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
        const ghostTextElements = Array.from(ghostElements) as HTMLElement[];
        if (ghostTextElements.length > 0) {
          const deepestGhostElement = ghostTextElements[ghostTextElements.length - 1];
          if ((deepestGhostElement as any).complete) {
            (deepestGhostElement as any).complete();
          }
        }
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
    } catch (e) {}

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
    if (!canEditText(props) || e.target.tagName === "BUTTON") return;

    const isFocusInGhostText = ghostTextRef.current?.contains(e.relatedTarget as Node);
    const isFocusInNode = elementRef.current?.contains(e.relatedTarget as Node);

    if (doubleClickedRef.current || (!editIntentRef.current && !bypassEarlyReturnRef.current)) {
      doubleClickedRef.current = false;
      editIntentRef.current = false;

      if (!isFocusInNode && !isFocusInGhostText) {
        setShowGhostText(false);
      }
      return;
    }

    const node = getCtx(props).allNodes.get().get(nodeId);
    const newHTML = currentContentRef.current;

    if (!focusTransitionRef.current) editIntentRef.current = false;

    if (newHTML === originalTextRef.current) {
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
      getCtx(props).notifyNode(node?.parentId || "");
    }

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
    if (!showGhostText && !doubleClickedRef.current) {
      getCtx(props).setClickedNodeId(nodeId);
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    getCtx(props).setClickedNodeId(nodeId);
    e.stopPropagation();
  };

  const handleClick = (e: MouseEvent) => {
    if (isEditableMode && supportsEditing) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          cursorPosRef.current = {
            node: range.startContainer,
            offset: range.startOffset,
          };
        }
      }, 0);
      editIntentRef.current = true;
    }
    e.stopPropagation();
  };

  const handleDoubleClick = (e: MouseEvent) => {
    if (!isEditableMode) {
      doubleClickedRef.current = true;
      editIntentRef.current = false;

      if (elementRef.current) {
        elementRef.current.blur();
      }
      getCtx(props).setClickedNodeId(nodeId, true);
    }
    e.stopPropagation();
  };

  const handleGhostContentSaved = () => {
    if (!canEditText(props)) return;

    if (elementRef.current) {
      currentContentRef.current = elementRef.current.innerHTML;
    }

    const node = getCtx(props).allNodes.get().get(nodeId);
    const newHTML = currentContentRef.current;

    if (newHTML === originalTextRef.current) {
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

      getCtx(props).notifyNode(node?.parentId || "");
    } catch (error) {
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
      <div className={getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)}>
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
          style: {
            cursor: isEditableMode ? "text" : "crosshair",
          },
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
