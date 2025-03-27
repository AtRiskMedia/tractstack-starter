import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore } from "@/store/storykeep.ts";
import { getTemplateNode } from "@/utils/common/nodesHelper.ts";
import type { NodeProps, FlatNode, PaneNode } from "@/types.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";

interface GhostTextProps {
  parentId: string;
  onComplete: (withText: boolean) => void;
  onFocus?: () => void; // New callback
  onBlur?: () => void; // New callback
  ctx?: NodeProps["ctx"];
}

export const GhostText = ({ parentId, onComplete, onFocus, onBlur, ctx }: GhostTextProps) => {
  const [text, setText] = useState("");
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const ghostRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  // Always use paragraph styles regardless of parent element type
  const nodeContext = ctx || getCtx();

  // Find any paragraph node to get its style, or use a basic style if none exists
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
    // Fallback to parent's styling if no paragraph found
    return nodeContext.getNodeClasses(parentId, viewportKeyStore.get().value);
  })();

  useEffect(() => {
    // When empty, show placeholder
    setShowPlaceholder(!text);
  }, [text]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onComplete(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        handleCommit();
      } else {
        onComplete(false);
      }
    }
  };

  const handleBlur = () => {
    // Call the onBlur callback if provided
    if (onBlur) onBlur();

    // Only process if we have content and aren't already processing
    if (isProcessingRef.current) return;

    if (text.trim()) {
      handleCommit();
    } else {
      onComplete(false);
    }
  };

  const handleFocus = () => {
    // Call the onFocus callback if provided
    if (onFocus) onFocus();

    setShowPlaceholder(false);
  };

  const handleCommit = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (text.trim()) {
      // Create a new paragraph node regardless of parent type
      const templateNode = getTemplateNode("p");

      // Set the text content
      if (templateNode.nodes && templateNode.nodes[0]) {
        templateNode.nodes[0].copy = text;
      } else {
        templateNode.copy = text;
      }

      // Add the node after the parent
      const nodeContext = ctx || getCtx();
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
    }

    // Notify completion with success status
    onComplete(true);
    isProcessingRef.current = false;
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || "";
    setText(newText);
    setShowPlaceholder(!newText);
  };

  return (
    <div
      ref={ghostRef}
      contentEditable
      suppressContentEditableWarning
      className={`${paragraphStyle} border-2 border-dashed border-cyan-500 min-h-[2em] p-2 mt-2 mb-2 focus:outline-none relative`}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      data-ghost-text="true"
    >
      {/* Custom placeholder implementation for contentEditable */}
      {showPlaceholder && (
        <div className="absolute top-2 left-2 pointer-events-none text-gray-500">
          Continue writing...
        </div>
      )}
    </div>
  );
};

export default GhostText;
