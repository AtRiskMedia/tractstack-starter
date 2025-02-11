import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { ClipboardDocumentIcon, PaintBrushIcon } from "@heroicons/react/24/outline";
import { getCtx } from "@/store/nodes";
import { isLinkNode, isMarkdownPaneFragmentNode, isPaneNode } from "@/utils/nodes/type-guards";
import { cloneDeep, isDeepEqual } from "@/utils/common/helpers";
import {
  settingsPanelStore,
  elementStylesMemoryStore,
  parentStylesMemoryStore,
  buttonStylesMemoryStore,
} from "@/store/storykeep";
import type { Tag, BaseNode, FlatNode } from "@/types";

interface StylesMemoryProps {
  node: FlatNode;
  parentNode?: BaseNode;
}

export const StylesMemory = ({ node, parentNode }: StylesMemoryProps) => {
  const elementStyles = useStore(elementStylesMemoryStore);
  const parentStyles = useStore(parentStylesMemoryStore);
  const buttonStyles = useStore(buttonStylesMemoryStore);
  const [isMatchingMemory, setIsMatchingMemory] = useState(false);

  const type = isMarkdownPaneFragmentNode(node)
    ? "parent"
    : isLinkNode(node)
      ? "button"
      : "element";

  useEffect(() => {
    if (!node) return;

    switch (type) {
      case "parent": {
        if (isMarkdownPaneFragmentNode(node) && isPaneNode(parentNode)) {
          const current = {
            styles: node.parentClasses || [],
            bgColour: parentNode.bgColour || "",
          };
          const memoryState = {
            styles: parentStyles?.parentClasses || [],
            bgColour: parentStyles?.bgColour || null,
          };
          setIsMatchingMemory(isDeepEqual(current, memoryState));
        }
        break;
      }
      case "button": {
        if (!isLinkNode(node) || !node.buttonPayload) break;
        const current = {
          buttonClasses: node.buttonPayload.buttonClasses || {},
          buttonHoverClasses: node.buttonPayload.buttonHoverClasses || {},
        };
        setIsMatchingMemory(isDeepEqual(current, buttonStyles));
        break;
      }
      case "element": {
        if (!parentNode || !isMarkdownPaneFragmentNode(parentNode) || !("tagName" in node)) break;
        const tagName = node.tagName as Tag;
        const memoryStyles = elementStyles[tagName];
        if (!memoryStyles) {
          setIsMatchingMemory(false);
          break;
        }
        // Build current state from defaultClasses and any overrides
        const defaultClasses = parentNode.defaultClasses?.[tagName];
        const overrideClasses = node.overrideClasses;
        const current = {
          mobile: { ...(defaultClasses?.mobile || {}), ...(overrideClasses?.mobile || {}) },
          tablet: { ...(defaultClasses?.tablet || {}), ...(overrideClasses?.tablet || {}) },
          desktop: { ...(defaultClasses?.desktop || {}), ...(overrideClasses?.desktop || {}) },
        };
        setIsMatchingMemory(isDeepEqual(current, memoryStyles));
        break;
      }
    }
  }, [node, parentNode, elementStyles, parentStyles, buttonStyles, type]);

  const handleCopy = () => {
    if (!node) return;

    switch (type) {
      case "parent": {
        if (!isMarkdownPaneFragmentNode(node) || !isPaneNode(parentNode)) break;
        parentStylesMemoryStore.set({
          parentClasses: node.parentClasses ? [...node.parentClasses] : [],
          bgColour: parentNode?.bgColour || null,
        });
        break;
      }
      case "button": {
        if (!isLinkNode(node) || !node.buttonPayload) break;
        buttonStylesMemoryStore.set({
          buttonClasses: cloneDeep(node.buttonPayload.buttonClasses || {}),
          buttonHoverClasses: cloneDeep(node.buttonPayload.buttonHoverClasses || {}),
        });
        break;
      }
      case "element": {
        if (!parentNode || !isMarkdownPaneFragmentNode(parentNode) || !("tagName" in node)) break;
        const tagName = node.tagName as Tag;
        const defaultClasses = parentNode.defaultClasses?.[tagName];
        const overrideClasses = node.overrideClasses;

        const newStyles = {
          ...elementStyles,
          [tagName]: {
            mobile: { ...(defaultClasses?.mobile || {}), ...(overrideClasses?.mobile || {}) },
            tablet: { ...(defaultClasses?.tablet || {}), ...(overrideClasses?.tablet || {}) },
            desktop: { ...(defaultClasses?.desktop || {}), ...(overrideClasses?.desktop || {}) },
          },
        };
        elementStylesMemoryStore.set(newStyles);
        break;
      }
    }
    setIsMatchingMemory(true);
  };

  const handlePaste = () => {
    const ctx = getCtx();
    if (!node) return;

    switch (type) {
      case "parent": {
        if (!isMarkdownPaneFragmentNode(node) || !isPaneNode(parentNode)) break;
        const memoryState = parentStyles;
        if (!memoryState) break;
        const updatedNode = cloneDeep(node);
        const updatedParent = cloneDeep(parentNode);
        if (memoryState.parentClasses) {
          updatedNode.parentClasses = cloneDeep(memoryState.parentClasses);
        }
        if (typeof memoryState.bgColour === "string") {
          updatedParent.bgColour = memoryState.bgColour;
        }
        ctx.modifyNodes([
          { ...updatedNode, isChanged: true },
          { ...updatedParent, isChanged: true },
        ]);
        break;
      }
      case "button": {
        if (!isLinkNode(node)) break;
        if (!buttonStyles) break;

        const updatedNode = cloneDeep(node);
        if (!updatedNode.buttonPayload) break;

        updatedNode.buttonPayload = {
          ...updatedNode.buttonPayload,
          buttonClasses: cloneDeep(buttonStyles.buttonClasses),
          buttonHoverClasses: cloneDeep(buttonStyles.buttonHoverClasses),
        };

        ctx.modifyNodes([{ ...updatedNode, isChanged: true }]);
        const currentSignal = settingsPanelStore.get();
        if (currentSignal) {
          settingsPanelStore.set({ ...currentSignal });
        }
        break;
      }
      case "element": {
        if (!parentNode || !isMarkdownPaneFragmentNode(parentNode) || !("tagName" in node)) break;
        const memoryStyles = elementStyles[node.tagName as Tag];
        if (!memoryStyles) break;

        const updatedNode = cloneDeep(node);
        const updatedParent = cloneDeep(parentNode);

        if (!updatedParent.defaultClasses) {
          updatedParent.defaultClasses = {};
        }
        updatedParent.defaultClasses[node.tagName] = cloneDeep(memoryStyles);
        delete updatedNode.overrideClasses;

        ctx.modifyNodes([
          { ...updatedParent, isChanged: true },
          { ...updatedNode, isChanged: true },
        ]);
        const currentSignal = settingsPanelStore.get();
        if (currentSignal) {
          settingsPanelStore.set({ ...currentSignal });
        }
        break;
      }
    }
  };

  const hasMemory =
    type === "parent"
      ? !!parentStyles
      : type === "button"
        ? !!buttonStyles
        : "tagName" in node
          ? !!elementStyles[node.tagName as Tag]
          : false;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className={`transition-colors ${
          isMatchingMemory ? "text-myorange hover:text-myblack" : "text-mydarkgrey hover:text-black"
        }`}
        title="Copy styles to memory"
      >
        <PaintBrushIcon className="w-4 h-4" />
      </button>

      <button
        onClick={handlePaste}
        disabled={!hasMemory || isMatchingMemory}
        className={`transition-colors ${
          !hasMemory || isMatchingMemory
            ? "text-mylightgrey cursor-not-allowed"
            : "text-mydarkgrey hover:text-black"
        }`}
        title={
          !hasMemory
            ? "No styles in memory"
            : isMatchingMemory
              ? "Current styles match memory"
              : "Paste styles from memory"
        }
      >
        <ClipboardDocumentIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
