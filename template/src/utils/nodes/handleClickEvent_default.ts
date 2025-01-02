import type { BaseNode, PaneFragmentNode, FlatNode } from "@/types.ts";

export function handleClickEventDefault(node: BaseNode, parentLayer: number | null) {
  console.log(`event on:`, node);

  if (!node.nodeType) return;

  switch (node.nodeType) {
    case "BgPane": {
      const bgPaneNode = node as PaneFragmentNode;
      if (!("type" in bgPaneNode)) return;

      switch (bgPaneNode.type) {
        case "visual-break":
          console.log(`visual-break`);
          break;
        default:
          console.log(`also missed on: ${bgPaneNode.type}`);
      }
      break;
    }

    case "Pane":
      console.log(
        node.nodeType,
        ` ** before calling this fn we need to reverse traverse to confirm if Markdown; if Markdown pass that node instead along with parentLayer; else pass the Pane, e.g. could be code hook`
      );
      break;

    case "Markdown":
      console.log(`parent layer: `, parentLayer);
      break;

    case "TagElement": {
      const tagNode = node as FlatNode;
      if (!("tagName" in tagNode)) return;

      switch (tagNode.tagName) {
        case "code":
          console.log(`special: widget`);
          break;
        case "p":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
          console.log(`standard element ${tagNode.tagName}`);
          break;
        case "img":
          console.log(`special element ${tagNode.tagName}`);
          break;
        case "li":
          console.log(`special element ${tagNode.tagName}`);
          break;
        case "a":
        case "button":
          console.log(`action link`);
          break;
        default:
          console.log(`also missed on: ${tagNode.tagName}`);
      }
      break;
    }

    default:
      console.log(`missed on: ${node.nodeType}`, node);
  }

  console.log(``);
  console.log(``);
}
