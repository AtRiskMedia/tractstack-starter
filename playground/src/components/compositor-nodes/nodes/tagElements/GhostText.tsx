import { ulid } from "ulid";
import { forwardRef, useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { getTemplateNode, processRichTextToNodes } from "@/utils/common/nodesHelper.ts";
import type { TemplateNode, NodeProps, FlatNode, PaneNode } from "@/types.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { useStore } from "@nanostores/react";

interface GhostTextProps {
  parentId: string;
  onComplete: () => void;
  onActivate?: () => void;
  onContentSaved?: () => void;
  ctx?: NodeProps["ctx"];
  ref?: React.Ref<HTMLDivElement>;
}

const GhostText = forwardRef<HTMLDivElement, GhostTextProps>(
  ({ parentId, onComplete, onActivate, onContentSaved, ctx }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState("");
    const [showNextGhost, setShowNextGhost] = useState(false);
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const ghostRef = useRef<HTMLDivElement>(null);
    const nextGhostRef = useRef<HTMLDivElement | null>(null);
    const nodeContext = ctx || getCtx();
    const focusTransitionRef = useRef(false);
    const processingCommitRef = useRef(false);
    const isCompletingRef = useRef(false);
    const commitTriggeredRef = useRef(false);
    const activeGhostId = useStore(nodeContext.ghostTextActiveId);

    const activate = () => {
      if (!isEditing) {
        setIsEditing(true);
        nodeContext.ghostTextActiveId.set(parentId);
        if (onActivate) onActivate();
      }
    };

    const wasActiveRef = useRef<boolean>(false);

    useEffect(() => {
      if (isEditing) {
        commitTriggeredRef.current = false;
      }
    }, [isEditing]);

    useEffect(() => {
      if (isCompletingRef.current || !isEditing) return;

      const isActive = activeGhostId === parentId;
      const wasActive = wasActiveRef.current;
      wasActiveRef.current = isActive;
      if (wasActive && !isActive && !commitTriggeredRef.current) {
        commitTriggeredRef.current = true;
        prepareToComplete();
      }
    }, [activeGhostId, isEditing]);

    useEffect(() => {
      if (ghostRef.current) {
        (ghostRef.current as any).activate = activate;
      }
    }, []);

    useEffect(() => {
      if (isEditing && ghostRef.current) {
        setTimeout(() => {
          if (ghostRef.current) {
            ghostRef.current.innerHTML = "";
            ghostRef.current.focus();

            const textNode = document.createTextNode("");
            ghostRef.current.appendChild(textNode);

            const selection = window.getSelection();
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }, 10);
      }
    }, [isEditing]);

    useEffect(() => {
      if (isEditing && text.trim() && !showNextGhost) {
        setShowNextGhost(true);
      }
    }, [isEditing, text, showNextGhost]);

    const handleNextGhostData = (paragraphText: string) => {
      setParagraphs((prev) => [...prev, paragraphText]);
    };

    const commitAllParagraphs = () => {
      if (processingCommitRef.current) return;
      processingCommitRef.current = true;

      const allTexts = [...paragraphs];
      if (text.trim()) allTexts.push(text.trim());
      const nonEmptyTexts = allTexts.filter((p) => p.trim());

      if (nonEmptyTexts.length > 0) {
        let lastNodeId = parentId;

        const handleInsertSignal = (tagName: string, nodeId: string) => {
          nodeContext.handleInsertSignal(tagName, nodeId);
        };

        nonEmptyTexts.forEach((paragraphText) => {
          const parsedNodes = processRichTextToNodes(paragraphText, lastNodeId, []);
          let templateNode: TemplateNode;

          if (parsedNodes.length > 0) {
            const pNodeId = ulid();
            const formattedNodes: FlatNode[] = [];
            for (let i = 0; i < parsedNodes.length; i++) {
              const node = parsedNodes[i];
              if (["strong", "em"].includes(node.tagName || "")) {
                const formattingNode: FlatNode = { ...node, nodes: [] } as TemplateNode;
                if (i + 1 < parsedNodes.length && parsedNodes[i + 1].tagName === "text") {
                  const textNode: FlatNode = {
                    id: ulid(),
                    parentId: formattingNode.id,
                    nodeType: "TagElement",
                    tagName: "text",
                    copy: parsedNodes[i + 1].copy,
                  };
                  (formattingNode as any).nodes = [textNode];
                  i++;
                }
                formattedNodes.push(formattingNode);
              } else if (node.tagName === "a") {
                const aNode: FlatNode = { ...node, nodes: [] } as TemplateNode;
                if (i + 1 < parsedNodes.length && parsedNodes[i + 1].tagName === "text") {
                  const textNode: FlatNode = {
                    id: ulid(),
                    parentId: aNode.id,
                    nodeType: "TagElement",
                    tagName: "text",
                    copy: parsedNodes[i + 1].copy,
                  };
                  (aNode as any).nodes = [textNode];
                  i++;
                }
                formattedNodes.push(aNode);
              } else if (node.tagName === "text") {
                const textNode: FlatNode = {
                  id: ulid(),
                  parentId: pNodeId,
                  nodeType: "TagElement",
                  tagName: "text",
                  copy: node.copy,
                };
                formattedNodes.push(textNode);
              }
            }
            templateNode = {
              id: pNodeId,
              parentId: lastNodeId,
              nodeType: "TagElement",
              tagName: "p",
              nodes: formattedNodes.map((node) => ({
                ...node,
                parentId: pNodeId,
                nodes: (node as any).nodes?.map((child: FlatNode) => ({
                  ...child,
                  parentId: node.id,
                })),
              })),
            };

            const newNodeId = nodeContext.addTemplateNode(
              lastNodeId,
              templateNode,
              lastNodeId,
              "after"
            );
            if (newNodeId) {
              lastNodeId = newNodeId;
              const allNodes = nodeContext.allNodes.get();
              const pNode = allNodes.get(newNodeId);
              if (pNode && "nodes" in pNode) {
                const aNode = (pNode as TemplateNode).nodes?.find((n) => n.tagName === "a");
                if (aNode && aNode.id) {
                  handleInsertSignal("a", aNode.id);
                }
              }
            }
          } else {
            templateNode = getTemplateNode("p");
            if (templateNode.nodes && templateNode.nodes[0]) {
              templateNode.nodes[0].copy = paragraphText;
            } else {
              templateNode.copy = paragraphText;
            }
            const newNodeId = nodeContext.addTemplateNode(
              lastNodeId,
              templateNode,
              lastNodeId,
              "after"
            );
            if (newNodeId) lastNodeId = newNodeId;
          }
        });

        const paneNodeId = nodeContext.getClosestNodeTypeFromId(parentId, "Pane");
        if (paneNodeId) {
          const paneNode = {
            ...cloneDeep(nodeContext.allNodes.get().get(paneNodeId)),
            isChanged: true,
          } as PaneNode;
          nodeContext.modifyNodes([paneNode]);
        }
      }

      // Reset state after commit
      setParagraphs([]);
      setText("");
      setIsEditing(false);
      setShowNextGhost(false);
      processingCommitRef.current = false;
      isCompletingRef.current = false;
      commitTriggeredRef.current = false;

      if (nodeContext.ghostTextActiveId.get() === parentId) {
        nodeContext.ghostTextActiveId.set("");
      }

      // Call the new callback after commit
      if (onContentSaved) onContentSaved();

      onComplete();
    };

    const prepareToComplete = () => {
      if (isCompletingRef.current || commitTriggeredRef.current) return;
      isCompletingRef.current = true;
      commitTriggeredRef.current = true;

      if (showNextGhost && nextGhostRef.current) {
        const nextGhost = nextGhostRef.current;
        if ((nextGhost as any).getData && typeof (nextGhost as any).getData === "function") {
          const nextGhostData = (nextGhost as any).getData();
          if (nextGhostData && nextGhostData.text) {
            handleNextGhostData(nextGhostData.text);
            if (nextGhostData.paragraphs && nextGhostData.paragraphs.length > 0) {
              setParagraphs((prev) => [...prev, ...nextGhostData.paragraphs]);
            }
          }
        }
      }
      commitAllParagraphs();
    };

    const getData = () => {
      const allParagraphs = [...paragraphs];
      if (showNextGhost && nextGhostRef.current) {
        const nextGhost = nextGhostRef.current;
        if ((nextGhost as any).getData && typeof (nextGhost as any).getData === "function") {
          const nextData = (nextGhost as any).getData();
          if (nextData.text) {
            allParagraphs.push(nextData.text);
          }
          if (nextData.paragraphs && nextData.paragraphs.length > 0) {
            allParagraphs.push(...nextData.paragraphs);
          }
        }
      }
      return {
        text: text.trim(),
        paragraphs: allParagraphs,
      };
    };

    useEffect(() => {
      if (ghostRef.current) {
        (ghostRef.current as any).getData = getData;
      }
    }, [text, paragraphs, showNextGhost]);

    const focusNextGhostPlaceholder = () => {
      if (showNextGhost && nextGhostRef.current) {
        focusTransitionRef.current = true;
        const placeholderElement = nextGhostRef.current.querySelector(
          '[data-ghost-text="placeholder"]'
        );
        if (placeholderElement && placeholderElement instanceof HTMLElement) {
          placeholderElement.focus();
          setTimeout(() => {
            focusTransitionRef.current = false;
          }, 100);
        } else {
          focusTransitionRef.current = false;
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        prepareToComplete();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        prepareToComplete();
      } else if (e.key === "Tab" && !e.shiftKey) {
        if (!text.trim()) {
          prepareToComplete();
          return;
        }
        e.preventDefault();
        setParagraphs((prev) => [...prev, text.trim()]);
        setText("");
        if (showNextGhost) {
          setTimeout(focusNextGhostPlaceholder, 50);
        } else {
          setShowNextGhost(true);
          setTimeout(focusNextGhostPlaceholder, 100);
        }
      }
    };

    const handleBlur = () => {
      if (focusTransitionRef.current) return;
      setTimeout(() => {
        if (focusTransitionRef.current) return;
        const activeElement = document.activeElement;
        if (activeElement) {
          const isGhostActive =
            activeElement.getAttribute("data-ghost-text") ||
            activeElement.closest("[data-ghost-text]");
          if (isGhostActive) return;
        }
        if (!commitTriggeredRef.current) {
          commitTriggeredRef.current = true;
          prepareToComplete();
        }
      }, 100);
    };

    const handleInput = (e: FormEvent<HTMLDivElement>) => {
      const html = e.currentTarget.innerHTML || "";
      setText(html);
    };

    const setNextGhostReference = (el: HTMLDivElement | null) => {
      nextGhostRef.current = el;
    };

    const paragraphStyle = (() => {
      const markdownId = nodeContext.getClosestNodeTypeFromId(parentId, "Markdown");
      if (markdownId) {
        const childIds = nodeContext.getChildNodeIDs(markdownId);
        for (const id of childIds) {
          const node = nodeContext.allNodes.get().get(id) as FlatNode;
          if (node && "tagName" in node && node.tagName === "p") {
            return nodeContext.getNodeClasses(id, viewportKeyStore.get().value);
          }
        }
      }
      return nodeContext.getNodeClasses(parentId, viewportKeyStore.get().value);
    })();

    if (isEditing) {
      return (
        <div ref={ref}>
          <div
            ref={ghostRef}
            contentEditable
            suppressContentEditableWarning
            className={`${paragraphStyle} border-2 border-cyan-500 p-2 mt-2 mb-2 focus:outline-none min-h-[2em]`}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            data-ghost-text="true"
            data-parent-id={parentId}
            style={{ direction: "ltr", textAlign: "left" }}
          ></div>

          {showNextGhost && (
            <div ref={setNextGhostReference}>
              <GhostText parentId={parentId} onComplete={prepareToComplete} ctx={ctx} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div ref={ref}>
        <div
          ref={ghostRef}
          className="mt-4 mb-4 p-3 border-2 border-dashed border-cyan-500 cursor-text text-gray-500 hover:bg-cyan-50 rounded flex items-center"
          onClick={activate}
          onFocus={activate}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              activate();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Continue writing (press Tab)"
          data-ghost-text="placeholder"
          data-parent-id={parentId}
        >
          <svg className="w-5 h-5 mr-2 text-cyan-500" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clipRule="evenodd"
            />
          </svg>
          Press "Tab" to Continue writing...
        </div>
      </div>
    );
  }
);

export default GhostText;
