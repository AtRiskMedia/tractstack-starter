import { NodesContext } from "@/store/nodes.ts";
import { NodesSerializer, type SaveData } from "@/store/nodesSerializer.ts";
import type {
  BaseNode,
  ImageFileNode,
  MarkdownPaneFragmentNode,
  MarkdownPaneDatum,
  MenuNode,
  PaneNode,
  ImpressionNode,
  StoryFragmentNode,
} from "@/types.ts";
import { MarkdownGenerator } from "@/utils/common/nodesMarkdownGenerator.ts";

export class NodesSerializer_Json implements NodesSerializer {
  save(ctx: NodesContext): SaveData {
    const rootNode = ctx.allNodes.get().get(ctx.rootNodeId.get());

    const saveData: SaveData = {
      files: [],
      menus: [],
      resources: [],
      panes: [],
      impressions: [],
      storyFragments: [],
      //tractStack: { id: "", slug: "", title: "", social_image_path: null },
    };
    this.processNode(ctx, rootNode, saveData);
    console.log("Save data:", saveData);
    return saveData;
  }

  getMarkdownPayload(markdownNode: MarkdownPaneFragmentNode): string {
    if (!markdownNode) return "";

    const markdownDatum: MarkdownPaneDatum = {
      id: markdownNode.id,
      isModal: false,
      type: "markdown",
      hiddenViewports: "none",
      imageMaskShapeDesktop: "none",
      imageMaskShapeTablet: "none",
      imageMaskShapeMobile: "none",
      textShapeOutsideDesktop: "none",
      textShapeOutsideTablet: "none",
      textShapeOutsideMobile: "none",
      optionsPayload: {
        classNamesPayload: {},
        classNames: {
          all: {},
        },
      },
    };
    return JSON.stringify(markdownDatum);
  }

  processNode(ctx: NodesContext, node: BaseNode | undefined, saveData: SaveData) {
    const isChanged = node.isChanged || false;
    if (!node) return;

    switch (node.nodeType) {
      case "Pane": {
        if (isChanged) {
          const paneNode = node as PaneNode;
          ctx.getChildNodeIDs(node.id).forEach((childId) => {
            const childNode = ctx.allNodes.get().get(childId);
            if (childNode?.nodeType === "Markdown") {
              const markdownNode = childNode as MarkdownPaneFragmentNode;
              const markdownGen = new MarkdownGenerator(ctx);
              saveData.panes.push({
                id: paneNode.id,
                title: paneNode.title,
                slug: paneNode.slug,
                changed: paneNode.changed?.toISOString() || "",
                created: paneNode.created?.toISOString() || "",
                files: "[]", // todo
                height_offset_desktop: paneNode.heightOffsetDesktop || 0,
                height_offset_tablet: paneNode.heightOffsetTablet || 0,
                height_offset_mobile: paneNode.heightOffsetMobile || 0,
                height_ratio_desktop: paneNode.heightRatioDesktop || "0.00",
                height_ratio_tablet: paneNode.heightRatioTablet || "0.00",
                height_ratio_mobile: paneNode.heightRatioMobile || "0.00",
                is_context_pane: paneNode.isContextPane ? 1 : 0,
                markdown_body: markdownGen.markdownFragmentToMarkdown(markdownNode.id), // todo
                options_payload: this.getMarkdownPayload(markdownNode), // todo
                markdown_id: "",
              });
            }
          });
        }
        break;
      }
      case "StoryFragment": {
        if (isChanged) {
          const storyFragment = node as StoryFragmentNode;
          saveData.storyFragments.push({
            id: storyFragment.id,
            trackstack_id: "",
            slug: storyFragment.slug,
            tailwind_background_colour: storyFragment.tailwindBgColour || "",
            title: storyFragment.title,
            changed: storyFragment.changed?.toISOString() || "",
            created: storyFragment.created?.toISOString() || "",
            menu_id: storyFragment.menuId || "",
            social_image_path: storyFragment.socialImagePath || "",
            pane_ids: storyFragment.paneIds,
          });
        }
        break;
      }
      case "File": {
        if (isChanged) {
          const fileData = node as ImageFileNode;
          saveData.files.push({
            id: fileData.id,
            alt_description: fileData.altDescription,
            filename: fileData.filename,
            url: fileData.src,
            src_set: fileData.srcSet || null,
          });
        }
        break;
      }
      case "Menu": {
        if (isChanged) {
          const menuData = node as MenuNode;
          saveData.menus.push({
            id: menuData.id,
            title: menuData.title,
            theme: menuData.theme,
            options_payload: JSON.stringify(menuData.optionsPayload),
          });
        }
        break;
      }
      case "Impression": {
        if (isChanged) {
          const impressionData = node as ImpressionNode;
          saveData.impressions.push({
            nodeType: "Impression",
            tagName: "impression",
            title: node.title,
            body: node.body,
            buttonText: node.buttonText,
            actionsLisp: node.actionsLisp,
          });
        }
        break;
      }
      case "TagElement":
      case "BgPane":
      case "Markdown":
        // ignore ?
        break;
      default:
        console.log(`processNode missed on`, node);
    }
    ctx.getChildNodeIDs(node.id).forEach((childId) => {
      this.processNode(ctx, ctx.allNodes.get().get(childId), saveData);
    });
  }
}
