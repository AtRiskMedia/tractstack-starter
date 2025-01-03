import type { PaneFragmentNode, FlatNode } from "@/types.ts";
import { settingsPanelStore } from "../../store/storykeep";

const mode = `default`;

// Type guard to check if a node is a visual break
function isVisualBreakNode(node: any): node is PaneFragmentNode {
  return node.nodeType === "BgPane" && "type" in node && node.type === "visual-break";
}

export function handleClickEventDefault(node: FlatNode, parentLayer: number | null) {
  console.log(`event on:`, node);

  if (!node.nodeType) return;

  switch (node.nodeType) {
    case "BgPane": {
      // Use type assertion after checking properties exist
      if (isVisualBreakNode(node)) {
        console.log(`visual-break`);
      } else {
        console.log(`unhandled BgPane type`);
      }
      break;
    }

    case "Markdown":
      console.log(`markdown pane. parent layer: `, parentLayer);
      break;

    case "TagElement": {
      if (!("tagName" in node)) return;

      switch (node.tagName) {
        case "code":
          console.log(`special: widget`);
          break;
        case "p":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
          console.log(`standard element ${node.tagName}`);
          break;
        case "img":
          console.log(`special element ${node.tagName}`);
          break;
        case "li":
          console.log(`special element ${node.tagName}`);
          break;
        case "a":
        case "button":
          settingsPanelStore.set({ node, mode });
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
