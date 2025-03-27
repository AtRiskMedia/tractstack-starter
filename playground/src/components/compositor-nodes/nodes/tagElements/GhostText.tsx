import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { getTemplateNode } from "@/utils/common/nodesHelper.ts";
import type { NodeProps, FlatNode, PaneNode } from "@/types.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";

interface GhostTextProps {
  parentId: string;
  onComplete: () => void;
  onActivate?: () => void;
  ctx?: NodeProps["ctx"];
}

const GhostText = ({ parentId, onComplete, onActivate, ctx }: GhostTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState("");
  const ghostRef = useRef<HTMLDivElement>(null);
  const nodeContext = ctx || getCtx();
  const processingCompleteRef = useRef(false);

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

  // Public method to activate the ghost text
  const activate = () => {
    if (!isEditing) {
      setIsEditing(true);
      if (onActivate) onActivate();
    }
  };

  // Expose activate method via ref
  useEffect(() => {
    if (ghostRef.current) {
      (ghostRef.current as any).activate = activate;
    }
  }, []);

  // When we switch to editing mode, focus the editable div
  useEffect(() => {
    if (isEditing && ghostRef.current) {
      // Need a small delay to ensure React has rendered the editable div
      setTimeout(() => {
        if (ghostRef.current) {
          // Clear any previous content and set focus
          ghostRef.current.innerText = "";
          ghostRef.current.focus();

          // Create a proper text node to ensure cursor is at the beginning
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

  // Handle key events in editable mode
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      processingCompleteRef.current = true;
      setIsEditing(false);
      setText("");
      onComplete();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        handleCommit();
      } else {
        processingCompleteRef.current = true;
        setIsEditing(false);
        onComplete();
      }
    }
  };

  // Handle blur events in editable mode
  const handleBlur = () => {
    if (processingCompleteRef.current) {
      // If we're already processing completion, don't re-trigger
      processingCompleteRef.current = false;
      return;
    }

    if (text.trim()) {
      handleCommit();
    } else {
      setIsEditing(false);
      onComplete();
    }
  };

  // Create a new paragraph node with the entered text
  const handleCommit = () => {
    processingCompleteRef.current = true;

    if (text.trim()) {
      // Create a new paragraph template node
      const templateNode = getTemplateNode("p");

      // Set the text content
      if (templateNode.nodes && templateNode.nodes[0]) {
        templateNode.nodes[0].copy = text;
      } else {
        templateNode.copy = text;
      }

      // Add the node after the parent
      nodeContext.addTemplateNode(parentId, templateNode, parentId, "after");

      // Mark the parent pane as changed
      const paneNodeId = nodeContext.getClosestNodeTypeFromId(parentId, "Pane");
      if (paneNodeId) {
        const paneNode = {
          ...cloneDeep(nodeContext.allNodes.get().get(paneNodeId)),
          isChanged: true,
        } as PaneNode;
        nodeContext.modifyNodes([paneNode]);
      }

      // Reset and notify completion
      setIsEditing(false);
      setText("");
      onComplete();
    }
  };

  // Handle input events in editable mode
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setText(e.currentTarget.innerText || "");
  };

  if (isEditing) {
    // Editable version - after user has activated it
    return (
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
    );
  }

  // Non-editable version - initial state
  return (
    <div
      ref={ghostRef}
      className="mt-4 mb-4 p-3 border-2 border-dashed border-cyan-500 cursor-text text-gray-500 hover:bg-cyan-50 rounded flex items-center"
      onClick={activate}
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
