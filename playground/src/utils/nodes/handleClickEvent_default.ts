/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PaneFragmentNode, FlatNode } from "@/types.ts";
import { settingsPanelStore } from "../../store/storykeep";

// Type guard to check if a node is a visual break
function isVisualBreakNode(node: any): node is PaneFragmentNode {
  return node.nodeType === "BgPane" && "type" in node && node.type === "visual-break";
}

export function handleClickEventDefault(
  node: FlatNode,
  parentNode?: FlatNode,
  parentLayer?: number | null
) {
  if (!node?.nodeType) return;

  switch (node.nodeType) {
    case "BgPane": {
      // Use type assertion after checking properties exist
      if (isVisualBreakNode(node)) {
        settingsPanelStore.set({ action: `style-break`, node, parentNode });
      } else {
        console.log(`unhandled BgPane type`);
      }
      break;
    }

    case "Pane":
      settingsPanelStore.set({
        action: `setup-codehook`,
        node: node,
      });
      break;

    case "Markdown":
      settingsPanelStore.set({
        action: `style-parent`,
        node: node,
        parentNode,
        ...(parentLayer ? { layer: parentLayer } : {}),
      });
      break;

    case "TagElement": {
      if (!("tagName" in node)) return;

      switch (node.tagName) {
        case "code":
          settingsPanelStore.set({ action: `style-widget`, node, parentNode });
          break;
        case "p":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
          settingsPanelStore.set({ action: `style-element`, node, parentNode });
          break;
        case "img":
          settingsPanelStore.set({ action: `style-image`, node, parentNode });
          break;
        case "li":
          settingsPanelStore.set({ action: `style-element`, node, parentNode });
          break;
        case "a":
        case "button":
          settingsPanelStore.set({ action: `style-link`, node, parentNode });
          break;
        default:
          console.log(`also missed on: ${node.tagName}`);
      }
      break;
    }

    default:
      console.log(`missed on: ${node.nodeType}`, node);
  }
}
