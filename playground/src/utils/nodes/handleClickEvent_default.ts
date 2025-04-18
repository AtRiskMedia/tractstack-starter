/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PaneFragmentNode, FlatNode } from "@/types.ts";
import { settingsPanelStore } from "@/store/storykeep";

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
  parentLayer?: number | null,
  minimized?: boolean
) {
  if (!node?.nodeType) return;

  // Base panel properties
  const panelProps: any = {
    nodeId: node.id,
  };

  // Add expanded/minimized properties as needed
  if (minimized === true) {
    panelProps.minimized = true;
  } else if (expanded) {
    panelProps.expanded = true;
  }

  // Add parent layer if provided
  if (parentLayer !== undefined && parentLayer !== null) {
    panelProps.layer = parentLayer;
  }

  switch (node.nodeType) {
    case "BgPane": {
      if (isVisualBreakNode(node)) {
        settingsPanelStore.set({
          action: "style-break",
          ...panelProps,
        });
      } else {
        console.log("unhandled BgPane type");
      }
      break;
    }

    case "Pane":
      if (isCodeHookPane(node))
        settingsPanelStore.set({
          action: "setup-codehook",
          ...panelProps,
        });
      else {
        settingsPanelStore.set({
          action: "style-parent",
          ...panelProps,
        });
      }
      break;

    case "Markdown":
      settingsPanelStore.set({
        action: "style-parent",
        ...panelProps,
      });
      break;

    case "TagElement": {
      if (!("tagName" in node)) return;

      switch (node.tagName) {
        case "code":
          settingsPanelStore.set({
            action: "style-widget",
            ...panelProps,
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
            ...panelProps,
          });
          break;
        case "img":
          settingsPanelStore.set({
            action: "style-image",
            ...panelProps,
          });
          break;
        case "li":
          settingsPanelStore.set({
            action: "style-li-element",
            ...panelProps,
          });
          break;
        case "a":
        case "button":
          settingsPanelStore.set({
            action: "style-link",
            ...panelProps,
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
