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

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const wasFocused = useRef<boolean>(false);
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));
  const originalTextRef = useRef<string>("");
  const elementRef = useRef<HTMLElement | null>(null);

  const Tag = props.tagName;

  useEffect(() => {
    if (/Chrome/.test(navigator.userAgent) && elementRef.current instanceof Node) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
              if (
                node instanceof Text &&
                node.parentElement &&
                node.previousSibling instanceof Element &&
                node.previousSibling.tagName === "A" &&
                node.textContent?.trim()
              ) {
                const anchor = node.previousSibling as HTMLAnchorElement;
                const text = node.textContent;
                node.parentElement.removeChild(node);
                anchor.appendChild(document.createTextNode(text));
              }
            });
          }
        });
      });

      observer.observe(elementRef.current, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }

    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      setChildren([...getCtx(props).getChildNodeIDs(nodeId)]);
    });

    getCtx(props).clickedNodeId.subscribe((val) => {
      if (wasFocused.current && val !== nodeId) {
        originalTextRef.current = "";
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInsertSignal = (tagName: string, nodeId: string) => {
    getCtx(props).handleInsertSignal(tagName, nodeId);
  };

  // Handle paste events to strip formatting
  const handlePaste = (e: ClipboardEvent<HTMLElement>) => {
    // Prevent the default paste behavior which would include formatting
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
    function reset() {
      wasFocused.current = false;
    }

    if (!canEditText(props) || e.target.tagName === "BUTTON" || !wasFocused.current) {
      reset();
      return;
    }

    const node = getCtx(props).allNodes.get().get(nodeId);

    reset();
    const newText = e.currentTarget.innerHTML;

    if (newText === originalTextRef.current) {
      getCtx(props).notifyNode(node?.parentId || "");
      return;
    }

    const textToNodes = parseMarkdownToNodes(newText, nodeId);

    if (textToNodes?.length > 0) {
      const originalLinksStyles = getCtx(props)
        .getNodesRecursively(node)
        .filter(
          (childNode) =>
            "tagName" in childNode &&
            typeof childNode.tagName === `string` &&
            [`a`, `button`].includes(childNode.tagName)
        )
        .map((childNode) => childNode as FlatNode)
        .reverse();

      const deletedNodes = getCtx(props).deleteChildren(nodeId);

      textToNodes.forEach((node: FlatNode) => {
        const foundNode = originalLinksStyles.find((x) => x.href === node.href);
        if (foundNode) {
          node.buttonPayload = foundNode.buttonPayload;
        } else if ([`a`, `button`].includes(node.tagName)) {
          // if new link, open settings panel
          handleInsertSignal(node.tagName, node.id);
        }
      });

      getCtx(props).addNodes(textToNodes);
      const paneNodeId = getCtx(props).nodeToNotify(nodeId, `TagElement`);
      if (paneNodeId) {
        const paneNode = {
          ...cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)),
          isChanged: true,
        } as PaneNode;
        getCtx(props).modifyNodes([paneNode]);
      }
      //getCtx(props).nodeToNotify(nodeId, "Pane");

      getCtx(props).history.addPatch({
        op: PatchOp.REMOVE,
        undo: (ctx) => {
          ctx.deleteChildren(nodeId);
          ctx.addNodes(deletedNodes);
          const paneNodeId = getCtx(props).nodeToNotify(nodeId, `TagElement`);
          if (paneNodeId) {
            const paneNode = {
              ...cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)),
              isChanged: true,
            } as PaneNode;
            getCtx(props).modifyNodes([paneNode]);
          }
          //ctx.nodeToNotify(nodeId, "Pane");
        },
        redo: (ctx) => {
          ctx.deleteChildren(nodeId);
          ctx.addNodes(textToNodes);
          const paneNodeId = getCtx(props).nodeToNotify(nodeId, `TagElement`);
          if (paneNodeId) {
            const paneNode = {
              ...cloneDeep(getCtx(props).allNodes.get().get(paneNodeId)),
              isChanged: true,
            } as PaneNode;
            getCtx(props).modifyNodes([paneNode]);
          }
          //ctx.nodeToNotify(nodeId, "Pane");
        },
      });
    }
  };

  if (showGuids.get()) {
    return (
      <div
        ref={elementRef as RefObject<HTMLDivElement>}
        className={getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)}
        onClick={(e) => {
          getCtx(props).setClickedNodeId(nodeId);
          e.stopPropagation();
        }}
      >
        <RenderChildren children={children} nodeProps={props} />
      </div>
    );
  }

  return createElement(
    Tag,
    {
      ref: elementRef,
      className: getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value),
      contentEditable: [`default`, `text`].includes(getCtx(props).toolModeValStore.get().value),
      suppressContentEditableWarning: true,
      onPaste: handlePaste, // Add the paste event handler
      onBlur: handleBlur,
      onClick: (e: MouseEvent) => e.stopPropagation(),
      onMouseDown: (e: MouseEvent) => {
        getCtx(props).setClickedNodeId(nodeId);
        e.stopPropagation();
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      },
      onFocus: (e: FocusEvent) => {
        if (!canEditText(props) || e.target.tagName === "BUTTON") {
          return;
        }
        wasFocused.current = true;
        originalTextRef.current = e.currentTarget.innerHTML;
      },
      onDoubleClick: (e: MouseEvent) => {
        getCtx(props).setClickedNodeId(nodeId, true);
        e.stopPropagation();
      },
    },
    <RenderChildren children={children} nodeProps={props} />
  );
};
