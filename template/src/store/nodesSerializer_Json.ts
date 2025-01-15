import { NodesContext } from "@/store/nodes.ts";
import { NodesSerializer, type SaveData } from "@/store/nodesSerializer.ts";
import type {
  BaseNode,
  MenuNode,
  ResourceNode,
  PaneNode,
  ImageFileNode,
  TractStackNode,
  StoryFragmentNode,
  StoryKeepAllNodes,
} from "@/types.ts";
import { MarkdownGenerator } from "@/utils/common/nodesMarkdownGenerator.ts";

export class NodesSerializer_Json implements NodesSerializer {
  // this migrates allNodes (currently generated using helpers from old data model)
  // and saves as new data model
  migrateAll(ctx: NodesContext, nodes: StoryKeepAllNodes): SaveData {
    const saveData: SaveData = {
      tractstacks: [],
      storyfragments: [],
      panes: [],
      markdowns: [],
      paneMarkdowns: [],
      storyfragmentPanes: {},
      paneFiles: [],
      files: [],
      menus: [],
      resources: [],
    };
    nodes?.tractstackNodes?.forEach((n: TractStackNode) => {
      this.processTractStackNode(n, saveData);
    });
    nodes?.storyfragmentNodes?.forEach((n: StoryFragmentNode) => {
      this.processStoryFragmentNode(n, saveData);
    });
    nodes?.paneNodes?.forEach((n: PaneNode) => {
      this.processPaneNode(ctx, n, saveData);
    });
    nodes?.fileNodes?.forEach((n: ImageFileNode) => {
      this.processImageFileNode(n, saveData);
    });
    nodes?.menuNodes?.forEach((n: MenuNode) => {
      this.processMenuNode(n, saveData);
    });
    nodes?.resourceNodes?.forEach((n: ResourceNode) => {
      this.processResourceNode(n, saveData);
    });
    return saveData;
  }

  processTractStackNode(node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const tractstackNode = node as TractStackNode;
    if (tractstackNode)
      saveData.tractstacks.push({
        id: tractstackNode.id,
        title: tractstackNode.title,
        slug: tractstackNode.slug,
        ...(typeof tractstackNode.socialImagePath === `string`
          ? { social_image_path: tractstackNode.socialImagePath }
          : {}),
      });
  }

  processResourceNode(node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const resourceNode = node as ResourceNode;
    if (resourceNode)
      saveData.resources.push({
        id: resourceNode.id,
        title: resourceNode.title,
        slug: resourceNode.slug,
        ...(typeof resourceNode.category === `string` ? { category: resourceNode.category } : {}),
        ...(typeof resourceNode.actionLisp === `string`
          ? { action_lisp: resourceNode.actionLisp }
          : {}),
        oneliner: resourceNode.oneliner,
        options_payload: JSON.stringify(resourceNode.optionsPayload),
      });
  }

  processMenuNode(node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const menuNode = node as MenuNode;
    if (menuNode)
      saveData.menus.push({
        id: menuNode.id,
        title: menuNode.title,
        theme: menuNode.theme,
        options_payload: JSON.stringify(menuNode.optionsPayload),
      });
  }

  processImageFileNode(node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const fileNode = node as ImageFileNode;
    if (fileNode)
      saveData.files.push({
        id: fileNode.id,
        filename: fileNode.filename,
        alt_description:
          fileNode.altDescription || `Alt description missing; we apologize for this`,
        url: fileNode.src,
        ...(typeof fileNode.srcSet === `string` ? { src_set: fileNode.srcSet } : {}),
      });
  }

  processStoryFragmentNode(node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const storyfragmentNode = node as StoryFragmentNode;
    if (storyfragmentNode && storyfragmentNode.parentId)
      saveData.storyfragments.push({
        id: storyfragmentNode.id,
        tractstack_id: storyfragmentNode.parentId,
        slug: storyfragmentNode.slug,
        title: storyfragmentNode.title,
        changed: storyfragmentNode?.changed?.toISOString() || new Date().toISOString(),
        created: storyfragmentNode?.created?.toISOString() || new Date().toISOString(),
        ...(typeof storyfragmentNode.tailwindBgColour === `string`
          ? { tailwind_background_colour: storyfragmentNode.tailwindBgColour }
          : {}),
        ...(typeof storyfragmentNode.menuId === `string`
          ? { menu_id: storyfragmentNode.menuId }
          : {}),
        ...(typeof storyfragmentNode.socialImagePath === `string`
          ? { social_image_path: storyfragmentNode.socialImagePath }
          : {}),
      });
    saveData.storyfragmentPanes[storyfragmentNode.id] = storyfragmentNode.paneIds || [];
  }

  processPaneNode(ctx: NodesContext, node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const paneNode = node as PaneNode;
    const allNodes = ctx.getNodesRecursively(paneNode).reverse();
    // for a code hook we get 1 "Pane" node; otherwise it's a nodeType wrapped in Pane
    const paneType = allNodes.length > 1 ? allNodes?.at(1)?.nodeType : allNodes?.at(0)?.nodeType;
    const markdownNode = allNodes?.at(1)?.nodeType === `Markdown` ? allNodes.at(1) : null;
    const nodes = [];
    if (allNodes.length > 1) nodes.push(...allNodes.slice(1));
    const impressionNodes = ctx.getImpressionNodesForPanes([paneNode.id]);
    if (impressionNodes.length > 0) nodes.push(...impressionNodes);
    const paneFilesNodes = ctx.getPaneImageFileIds(paneNode.id);
    const optionsPayload = {
      isDecorative: paneNode.isDecorative || false,
      ...(typeof paneNode.bgColour === `string` ? { bgColour: paneNode.bgColour } : {}),
      ...(nodes?.length > 0 ? { nodes } : {}),
      ...(typeof paneNode.heightOffsetDesktop === `number` && paneNode.heightOffsetDesktop > 0
        ? { height_offset_desktop: paneNode.heightOffsetDesktop }
        : {}),
      ...(typeof paneNode.heightOffsetTablet === `number` && paneNode.heightOffsetTablet > 0
        ? { height_offset_tablet: paneNode.heightOffsetTablet }
        : {}),
      ...(typeof paneNode.heightOffsetMobile === `number` && paneNode.heightOffsetMobile > 0
        ? { height_offset_mobile: paneNode.heightOffsetMobile }
        : {}),
      ...(typeof paneNode.heightRatioDesktop === `string`
        ? { height_ratio_desktop: paneNode.heightRatioDesktop }
        : {}),
      ...(typeof paneNode.heightRatioTablet === `string`
        ? { height_ratio_tablet: paneNode.heightRatioTablet }
        : {}),
      ...(typeof paneNode.heightRatioMobile === `string`
        ? { height_ratio_mobile: paneNode.heightRatioMobile }
        : {}),
      ...(typeof paneNode.codeHookTarget === `string`
        ? { codeHookTarget: paneNode.codeHookTarget }
        : {}),
      ...(typeof paneNode.codeHookTarget === `string` &&
      typeof paneNode.codeHookPayload !== `undefined`
        ? { codeHookPayload: paneNode.codeHookPayload }
        : {}),
      ...(typeof paneNode.heldBeliefs !== `undefined` ? { heldBeliefs: paneNode.heldBeliefs } : {}),
      ...(typeof paneNode.withheldBeliefs !== `undefined`
        ? { withheldBeliefs: paneNode.withheldBeliefs }
        : {}),
    };
    if (paneFilesNodes) {
      paneFilesNodes.forEach((fid: string) => {
        saveData.paneFiles.push({
          pane_id: paneNode.id,
          file_id: fid,
        });
      });
    }
    if (markdownNode) {
      const markdownGen = new MarkdownGenerator(ctx);
      const markdownBody = markdownGen.markdownFragmentToMarkdown(markdownNode.id);
      if (markdownBody)
        saveData.markdowns.push({
          id: markdownNode.id,
          markdown_body: markdownBody,
        });
      saveData.paneMarkdowns.push({
        paneId: paneNode.id,
        markdownId: markdownNode.id,
      });
    }
    if (paneType)
      saveData.panes.push({
        id: paneNode.id,
        title: paneNode.title,
        slug: paneNode.slug,
        pane_type: paneType,
        changed: paneNode?.changed?.toISOString() || new Date().toISOString(),
        created: paneNode?.created?.toISOString() || new Date().toISOString(),
        is_context_pane: paneNode.isContextPane ? 1 : 0,
        options_payload: JSON.stringify(optionsPayload),
        ...(typeof markdownNode?.id === `string` ? { markdown_id: markdownNode.id } : {}),
      });
  }

  save(ctx: NodesContext): SaveData {
    console.log(`must rewrite using the individual helper fns`, ctx);
    //const rootNode = ctx.allNodes.get().get(ctx.rootNodeId.get());
    const saveData: SaveData = {
      tractstacks: [],
      storyfragments: [],
      panes: [],
      markdowns: [],
      paneMarkdowns: [],
      storyfragmentPanes: {},
      paneFiles: [],
      files: [],
      menus: [],
      resources: [],
    };
    //this.processNode(ctx, rootNode, saveData);
    ////console.log("Save data:", saveData);
    return saveData;
  }

  //getMarkdownPayload(markdownNode: MarkdownPaneFragmentNode): string {
  //  if (!markdownNode) return "";

  //  const markdownDatum: MarkdownPaneDatum = {
  //    id: markdownNode.id,
  //    isModal: false,
  //    type: "markdown",
  //    hiddenViewports: "none",
  //    imageMaskShapeDesktop: "none",
  //    imageMaskShapeTablet: "none",
  //    imageMaskShapeMobile: "none",
  //    textShapeOutsideDesktop: "none",
  //    textShapeOutsideTablet: "none",
  //    textShapeOutsideMobile: "none",
  //    optionsPayload: {
  //      classNamesPayload: {},
  //      classNames: {
  //        all: {},
  //      },
  //    },
  //  };
  //  return JSON.stringify(markdownDatum);
  //}

  //  // will rewrite to use the above helper fns
  //  processNode(ctx: NodesContext, node: BaseNode | undefined, saveData: SaveData) {
  //    //const isChanged = node?.isChanged || false;
  //    if (!node) return;
  //
  //    console.log(`use the new process*Node helper`);
  //    //switch (node.nodeType) {
  //    //  case "Pane": {
  //    //    //if (isChanged) {
  //    //    //  const paneNode = node as PaneNode;
  //    //    //  ctx.getChildNodeIDs(node.id).forEach((childId) => {
  //    //    //    const childNode = ctx.allNodes.get().get(childId);
  //    //    //    if (childNode?.nodeType === "Markdown") {
  //    //    //      const markdownNode = childNode as MarkdownPaneFragmentNode;
  //    //    //      const markdownGen = new MarkdownGenerator(ctx);
  //    //    //      saveData.panes.push({
  //    //    //        id: paneNode.id,
  //    //    //        title: paneNode.title,
  //    //    //        slug: paneNode.slug,
  //    //    //        changed: paneNode?.changed?.toISOString() || new Date().toISOString(),
  //    //    //        created: paneNode?.created?.toISOString() || new Date().toISOString(),
  //    //    //        height_offset_desktop: paneNode.heightOffsetDesktop || 0,
  //    //    //        height_offset_tablet: paneNode.heightOffsetTablet || 0,
  //    //    //        height_offset_mobile: paneNode.heightOffsetMobile || 0,
  //    //    //        height_ratio_desktop: paneNode.heightRatioDesktop || "0.00",
  //    //    //        height_ratio_tablet: paneNode.heightRatioTablet || "0.00",
  //    //    //        height_ratio_mobile: paneNode.heightRatioMobile || "0.00",
  //    //    //        is_context_pane: paneNode.isContextPane ? 1 : 0,
  //    //    //        markdown_body: markdownGen.markdownFragmentToMarkdown(markdownNode.id), // todo
  //    //    //        options_payload: this.getMarkdownPayload(markdownNode), // todo
  //    //    //        markdown_id: "",
  //    //    //      });
  //    //    //    }
  //    //    //  });
  //    //    //}
  //    //    break;
  //    //  }
  //    //  case "StoryFragment": {
  //    //    if (isChanged) {
  //    //      const storyfragmentNode = node as StoryFragmentNode;
  //    //      saveData.storyfragments.push({
  //    //        id: storyfragmentNode.id,
  //    //        tractstack_id: "",
  //    //        slug: storyfragmentNode.slug,
  //    //        tailwind_background_colour: storyfragmentNode.tailwindBgColour || "",
  //    //        title: storyfragmentNode.title,
  //    //        changed: storyfragmentNode?.changed?.toISOString() || new Date().toISOString(),
  //    //        created: storyfragmentNode?.created?.toISOString() || new Date().toISOString(),
  //    //        menu_id: storyfragmentNode.menuId || "",
  //    //        social_image_path: storyfragmentNode.socialImagePath || "",
  //    //      });
  //    //    }
  //    //    break;
  //    //  }
  //    //  case "File": {
  //    //    if (isChanged) {
  //    //      const fileData = node as ImageFileNode;
  //    //      saveData.files.push({
  //    //        id: fileData.id,
  //    //        alt_description: fileData.altDescription,
  //    //        filename: fileData.filename,
  //    //        url: fileData.src,
  //    //        src_set: fileData.srcSet || null,
  //    //      });
  //    //    }
  //    //    break;
  //    //  }
  //    //  case "Menu": {
  //    //    if (isChanged) {
  //    //      const menuData = node as MenuNode;
  //    //      saveData.menus.push({
  //    //        id: menuData.id,
  //    //        title: menuData.title,
  //    //        theme: menuData.theme,
  //    //        options_payload: JSON.stringify(menuData.optionsPayload),
  //    //      });
  //    //    }
  //    //    break;
  //    //  }
  //    //  //case "Impression": {
  //    //  //  if (isChanged) {
  //    //  //    const impressionData = node as ImpressionNode;
  //    //  //    saveData.impressions.push({
  //    //  //      id: impressionData.id,
  //    //  //      parentId: impressionData.parentId,
  //    //  //      nodeType: "Impression",
  //    //  //      tagName: "impression",
  //    //  //      title: impressionData.title,
  //    //  //      body: impressionData.body,
  //    //  //      buttonText: impressionData.buttonText,
  //    //  //      actionsLisp: impressionData.actionsLisp,
  //    //  //    });
  //    //  //  }
  //    //  //  break;
  //    //  //}
  //    //  case "Impression":
  //    //  case "TagElement":
  //    //  case "BgPane":
  //    //  case "Markdown":
  //    //    // ignore ?
  //    //    break;
  //    //  default:
  //    //    console.log(`processNode missed on`, node);
  //    //}
  //    //ctx.getChildNodeIDs(node.id).forEach((childId) => {
  //    //  this.processNode(ctx, ctx.allNodes.get().get(childId), saveData);
  //    //});
  //  }
}
