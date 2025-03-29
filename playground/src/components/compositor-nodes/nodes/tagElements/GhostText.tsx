import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { getTemplateNode } from "@/utils/common/nodesHelper.ts";
import type { NodeProps, FlatNode, PaneNode } from "@/types.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { useStore } from "@nanostores/react";

interface GhostTextProps {
  parentId: string;
  onComplete: () => void;
  onActivate?: () => void;
  ctx?: NodeProps["ctx"];
}

const GhostText = ({ parentId, onComplete, onActivate, ctx }: GhostTextProps) => {
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
    if (isCompletingRef.current) return;

    const isActive = activeGhostId === parentId;
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (wasActive && !isActive) {
      isCompletingRef.current = true;
      prepareToComplete();
    }
  }, [activeGhostId]);

  useEffect(() => {
    if (ghostRef.current) {
      (ghostRef.current as any).activate = activate;
    }
  }, []);

  useEffect(() => {
    if (isEditing && ghostRef.current) {
      setTimeout(() => {
        if (ghostRef.current) {
          ghostRef.current.innerText = "";
          ghostRef.current.focus();

          const textNode = document.createTextNode("");
          ghostRef.current.appendChild(textNode);

          // Set cursor at the beginning
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

  // Show next ghost when text is entered
  useEffect(() => {
    if (isEditing && text.trim() && !showNextGhost) {
      setShowNextGhost(true);
    }
  }, [isEditing, text, showNextGhost]);

  // Listen for data from next ghost text
  const handleNextGhostData = (paragraphText: string) => {
    // Add the text to our paragraphs array
    setParagraphs((prev) => [...prev, paragraphText]);
  };

  // Commit all paragraphs as a chain
  const commitAllParagraphs = () => {
    // Don't process if already handling a commit
    if (processingCommitRef.current) return;
    processingCommitRef.current = true;

    // Collect all paragraph texts, including the current one if it has content
    const allTexts = [...paragraphs];
    if (text.trim()) {
      allTexts.push(text.trim());
    }

    // Filter out empty paragraphs
    const nonEmptyTexts = allTexts.filter((p) => p.trim());

    if (nonEmptyTexts.length > 0) {
      let lastNodeId = parentId;

      // Insert each paragraph in sequence
      nonEmptyTexts.forEach((paragraphText) => {
        // Create a new paragraph template node
        const templateNode = getTemplateNode("p");

        // Set the text content
        if (templateNode.nodes && templateNode.nodes[0]) {
          templateNode.nodes[0].copy = paragraphText;
        } else {
          templateNode.copy = paragraphText;
        }

        // Add the node after the previous node
        const newNodeId = nodeContext.addTemplateNode(
          lastNodeId,
          templateNode,
          lastNodeId,
          "after"
        );

        // Update the insertion point for the next paragraph
        if (newNodeId) {
          lastNodeId = newNodeId;
        }
      });

      // Mark the parent pane as changed
      const paneNodeId = nodeContext.getClosestNodeTypeFromId(parentId, "Pane");
      if (paneNodeId) {
        const paneNode = {
          ...cloneDeep(nodeContext.allNodes.get().get(paneNodeId)),
          isChanged: true,
        } as PaneNode;
        nodeContext.modifyNodes([paneNode]);
      }
    }

    // Reset state
    setParagraphs([]);
    setText("");
    setIsEditing(false);
    setShowNextGhost(false);
    processingCommitRef.current = false;
    isCompletingRef.current = false;

    // Clear this ghost text from active registry if it's still set to this ID
    if (nodeContext.ghostTextActiveId.get() === parentId) {
      nodeContext.ghostTextActiveId.set("");
    }

    // Signal completion
    onComplete();
  };

  // Get any data from next ghost before unmounting
  const prepareToComplete = () => {
    // If there's a next ghost, get its data first
    if (showNextGhost && nextGhostRef.current) {
      const nextGhost = nextGhostRef.current;

      // Check if the next ghost has a getData method
      if ((nextGhost as any).getData && typeof (nextGhost as any).getData === "function") {
        // Get data from the next ghost
        const nextGhostData = (nextGhost as any).getData();

        // Update paragraphs with any data from next ghost
        if (nextGhostData && nextGhostData.text) {
          handleNextGhostData(nextGhostData.text);

          // Also include any nested paragraphs
          if (nextGhostData.paragraphs && nextGhostData.paragraphs.length > 0) {
            setParagraphs((prev) => [...prev, ...nextGhostData.paragraphs]);
          }
        }
      }
    }

    // Now commit all collected paragraphs
    commitAllParagraphs();
  };

  // Export data method for parent to call
  const getData = () => {
    // Calculate paragraphs including current text if non-empty
    const allParagraphs = [...paragraphs];

    // Get data from next ghost if it exists
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

  // Expose getData method via ref
  useEffect(() => {
    if (ghostRef.current) {
      (ghostRef.current as any).getData = getData;
    }
  }, [text, paragraphs, showNextGhost]);

  // Focus the next ghost's placeholder and activate it
  const focusNextGhostPlaceholder = () => {
    if (showNextGhost && nextGhostRef.current) {
      focusTransitionRef.current = true;

      // Find the placeholder element within the next ghost
      const placeholderElement = nextGhostRef.current.querySelector(
        '[data-ghost-text="placeholder"]'
      );

      if (placeholderElement && placeholderElement instanceof HTMLElement) {
        // Set focus on the placeholder element which will auto-activate due to onFocus={activate}
        placeholderElement.focus();

        // Reset focus transition flag after a delay
        setTimeout(() => {
          focusTransitionRef.current = false;
        }, 100);
      } else {
        // If placeholder isn't found, reset the flag
        focusTransitionRef.current = false;
      }
    }
  };

  // Handle key events in editable mode
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      prepareToComplete();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      prepareToComplete();
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Check if the current text is empty
      if (!text.trim()) {
        // Allow the default tab behavior to continue
        // This will naturally move focus to the next focusable element

        // Just complete/unmount this ghost text without preventing default
        prepareToComplete();

        // Don't preventDefault() so tab works naturally
        return;
      }

      // For non-empty text, continue with the existing behavior
      e.preventDefault();

      // If there's text, add it to paragraphs
      setParagraphs((prev) => [...prev, text.trim()]);
      // Clear current text field
      setText("");

      // If next ghost already exists, focus its placeholder
      if (showNextGhost) {
        // Use a small timeout to ensure the next component is rendered
        setTimeout(focusNextGhostPlaceholder, 50);
      }
      // If next ghost doesn't exist yet, create it and then focus it
      else {
        setShowNextGhost(true);
        // Wait for next ghost to render
        setTimeout(focusNextGhostPlaceholder, 100);
      }
    }
  };

  // Handle blur events in editable mode
  const handleBlur = () => {
    // Skip if we're handling a focus transition
    if (focusTransitionRef.current) return;

    // Allow a little time for any click to register on child elements
    setTimeout(() => {
      // Skip if we're in the middle of a focus transition
      if (focusTransitionRef.current) return;

      // Check if focus is within our ghost text chain
      const activeElement = document.activeElement;
      if (activeElement) {
        // Check if the active element is a ghost text or contains one
        const isGhostActive =
          activeElement.getAttribute("data-ghost-text") ||
          activeElement.closest("[data-ghost-text]");

        // If focus is still within ghost text chain, don't complete yet
        if (isGhostActive) return;
      }

      // Focus is outside our ghost text chain, prepare to complete
      prepareToComplete();
    }, 100);
  };

  // Handle input events in editable mode
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setText(e.currentTarget.innerText || "");
  };

  // Set reference to next ghost
  const setNextGhostReference = (el: HTMLDivElement | null) => {
    nextGhostRef.current = el;
  };

  // Find a paragraph node style to match the current document style
  const paragraphStyle = (() => {
    // Try to find a paragraph node in the Markdown parent
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
    // Fallback to parent's styling
    return nodeContext.getNodeClasses(parentId, viewportKeyStore.get().value);
  })();

  if (isEditing) {
    // Editable version - after user has activated it
    return (
      <>
        <div
          ref={ghostRef}
          contentEditable
          suppressContentEditableWarning
          className={`${paragraphStyle} border-2 border-cyan-500 p-2 mt-2 mb-2 focus:outline-none min-h-[2em]`}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          data-ghost-text="true"
          style={{ direction: "ltr", textAlign: "left" }}
        ></div>

        {showNextGhost && (
          <div ref={setNextGhostReference}>
            <GhostText parentId={parentId} onComplete={prepareToComplete} ctx={ctx} />
          </div>
        )}
      </>
    );
  }

  // Non-editable version - initial state (placeholder)
  return (
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
  );
};

export default GhostText;
