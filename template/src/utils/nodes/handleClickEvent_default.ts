import type { PaneFragmentNode, FlatNode } from "@/types.ts";
import { settingsPanelStore } from "../../store/storykeep";

// Updated type predicate to check for visual break nodes
function isVisualBreakNode(node: FlatNode): boolean {
  return (
    node.nodeType === "BgPane" &&
    "type" in node &&
    (node as PaneFragmentNode).type === "visual-break"
  );
}

// Updated type predicate to check for code hook panes
function isCodeHookPane(node: FlatNode): boolean {
  return node.nodeType === "Pane" && "codeHookTarget" in node;
}

export function handleClickEventDefault(
  node: FlatNode,
  expanded: boolean,
  parentLayer?: number | null
) {
  if (!node?.nodeType) return;

  switch (node.nodeType) {
    case "BgPane": {
      if (isVisualBreakNode(node)) {
        settingsPanelStore.set({ action: "style-break", nodeId: node.id, expanded: true });
      } else {
        console.log("unhandled BgPane type");
      }
      break;
    }

    case "Pane":
      if (isCodeHookPane(node))
        settingsPanelStore.set({
          action: "setup-codehook",
          nodeId: node.id,
          expanded: true,
        });
      else {
        settingsPanelStore.set({
          action: "style-parent",
          nodeId: node.id,
          ...(parentLayer ? { layer: parentLayer } : {}),
          ...(expanded ? { expanded: true } : {}),
        });
      }
      break;

    case "Markdown":
      settingsPanelStore.set({
        action: "style-parent",
        nodeId: node.id,
        ...(parentLayer ? { layer: parentLayer } : {}),
        ...(expanded ? { expanded: true } : {}),
      });
      break;

    case "TagElement": {
      if (!("tagName" in node)) return;

      switch (node.tagName) {
        case "code":
          settingsPanelStore.set({
            action: "style-widget",
            nodeId: node.id,
            ...(expanded ? { expanded: true } : {}),
          });
          break;
        case "p":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "ol":
          settingsPanelStore.set({
            action: "style-element",
            nodeId: node.id,
            ...(expanded ? { expanded: true } : {}),
          });
          break;
        case "img":
          settingsPanelStore.set({
            action: "style-image",
            nodeId: node.id,
            ...(expanded ? { expanded: true } : {}),
          });
          break;
        case "li":
          settingsPanelStore.set({
            action: "style-li-element",
            nodeId: node.id,
            ...(expanded ? { expanded: true } : {}),
          });
          break;
        case "a":
        case "button":
          settingsPanelStore.set({
            action: "style-link",
            nodeId: node.id,
            ...(expanded ? { expanded: true } : {}),
          });
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
