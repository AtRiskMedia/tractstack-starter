import { NodesContext } from "@/store/nodes.ts";
import { processClassesForViewports } from "@/utils/nodes/reduceNodesClassNames.ts";
import { NodesSerializer, type SaveData, type LoadData } from "@/store/nodesSerializer.ts";
import type {
  BaseNode,
  FlatNode,
  MenuNode,
  ResourceNode,
  PaneNode,
  BeliefNode,
  ImageFileNode,
  TractStackNode,
  StoryFragmentNode,
  MarkdownPaneFragmentNode,
} from "@/types.ts";
import { MarkdownGenerator } from "@/utils/common/nodesMarkdownGenerator.ts";

export class NodesSerializer_Json extends NodesSerializer {
  protected computeElementCss(
    node: FlatNode,
    parentNode: MarkdownPaneFragmentNode
  ): string | undefined {
    if (!("tagName" in node)) return undefined;
    const tagNameStr = node.tagName;
    const defaultClasses = parentNode.defaultClasses?.[tagNameStr];
    if (!defaultClasses?.mobile) return undefined;
    const [allClasses] = processClassesForViewports(defaultClasses, node.overrideClasses || {}, 1);
    return allClasses[0];
  }

  protected computeParentCss(node: MarkdownPaneFragmentNode): string[] {
    if (!node.parentClasses) return [];
    const parentCssArray: string[] = [];
    node.parentClasses.forEach((layer) => {
      const [allClasses] = processClassesForViewports(layer, {}, 1);
      parentCssArray.push(allClasses[0]);
    });
    return parentCssArray;
  }

  // Helper to find closest markdown ancestor
  private getClosestMarkdownAncestor(node: BaseNode, allNodes: BaseNode[]): string | null {
    let current = node;
    while (current.parentId) {
      const parent = allNodes.find((n) => n.id === current.parentId);
      if (!parent) break;
      if (parent.nodeType === "Markdown") {
        return parent.id;
      }
      current = parent;
    }
    return null;
  }

  // this migrates allNodes (currently generated using helpers from old data model)
  // and saves as new data model
  migrateAll(ctx: NodesContext, nodes: LoadData): SaveData {
    const saveData: SaveData = {
      tractstacks: [],
      storyfragments: [],
      panes: [],
      markdowns: [],
      paneFiles: [],
      files: [],
      menus: [],
      resources: [],
      beliefs: [],
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

  processBeliefNode(node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const beliefNode = node as BeliefNode;
    if (beliefNode) {
      saveData.beliefs.push({
        id: beliefNode.id,
        title: beliefNode.title,
        slug: beliefNode.slug,
        scale: beliefNode.scale,
        ...(Array.isArray(beliefNode.customValues)
          ? { custom_values: beliefNode.customValues.join(",") }
          : {}),
      });
    }
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
        pane_ids: storyfragmentNode.paneIds,
        created: this.ensureDate(storyfragmentNode.created),
        changed: this.ensureDate(storyfragmentNode.changed),
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
  }

  processPaneNode(ctx: NodesContext, node: BaseNode | undefined, saveData: SaveData) {
    if (!node) return;
    const paneNode = node as PaneNode;
    const allNodes = ctx.getNodesRecursively(paneNode).reverse();

    // Compute elementCss
    allNodes.forEach((node) => {
      if (node.nodeType === "TagElement" && node.parentId) {
        // Find the markdown parent
        const markdownParent = allNodes.find(
          (n): n is MarkdownPaneFragmentNode =>
            n.nodeType === "Markdown" && n.id === this.getClosestMarkdownAncestor(node, allNodes)
        );

        if (markdownParent) {
          const flatNode = node as FlatNode;
          const elementCss = this.computeElementCss(flatNode, markdownParent);
          if (elementCss) {
            flatNode.elementCss = elementCss;
          }
        }
      }
    });
    // Then compute parentCss for markdown nodes
    allNodes.forEach((node) => {
      if (node.nodeType === "Markdown") {
        const markdownNode = node as MarkdownPaneFragmentNode;
        const parentCss = this.computeParentCss(markdownNode);
        if (parentCss.length > 0) {
          markdownNode.parentCss = parentCss;
        }
      }
    });

    // First check if it's a CodeHook pane
    if (
      allNodes.length === 1 &&
      allNodes[0].nodeType === "Pane" &&
      typeof (allNodes[0] as PaneNode).codeHookTarget === "string"
    ) {
      const paneType = "CodeHook";
      this.processPaneData(paneNode, paneType, null, allNodes, ctx, saveData);
      return;
    }

    // Find the first occurrence of either Markdown or BgPane
    const validPaneTypes = ["Markdown", "BgPane"];
    let markdownNode = null;
    let paneType = null;

    for (let i = 1; i < allNodes.length; i++) {
      const currentNode = allNodes[i];
      if (validPaneTypes.includes(currentNode.nodeType)) {
        paneType = currentNode.nodeType;
        if (paneType === "Markdown") {
          markdownNode = currentNode;
        }
        break;
      }
    }

    if (paneType) {
      this.processPaneData(paneNode, paneType, markdownNode, allNodes, ctx, saveData);
    } else {
      console.warn(`Could not determine pane type for pane ${paneNode.id}`);
      console.log(
        "Nodes structure:",
        allNodes.map((n) => ({ id: n.id, type: n.nodeType }))
      );
    }
  }

  protected processPaneData(
    paneNode: PaneNode,
    paneType: string,
    markdownNode: BaseNode | null,
    allNodes: BaseNode[],
    ctx: NodesContext,
    saveData: SaveData
  ) {
    console.log(`processPaneData`, paneNode, allNodes);
    const nodes = allNodes.length > 1 ? allNodes.slice(1) : [];

    const paneFilesNodes = ctx.getPaneImageFileIds(paneNode.id);
    const optionsPayload = {
      isDecorative: paneNode.isDecorative || false,
      ...(typeof paneNode.bgColour === "string" ? { bgColour: paneNode.bgColour } : {}),
      ...(nodes?.length > 0 ? { nodes } : {}),
      ...(typeof paneNode.heightOffsetDesktop === "number" && paneNode.heightOffsetDesktop > 0
        ? { height_offset_desktop: paneNode.heightOffsetDesktop }
        : {}),
      ...(typeof paneNode.heightOffsetTablet === "number" && paneNode.heightOffsetTablet > 0
        ? { height_offset_tablet: paneNode.heightOffsetTablet }
        : {}),
      ...(typeof paneNode.heightOffsetMobile === "number" && paneNode.heightOffsetMobile > 0
        ? { height_offset_mobile: paneNode.heightOffsetMobile }
        : {}),
      ...(typeof paneNode.heightRatioDesktop === "string"
        ? { height_ratio_desktop: paneNode.heightRatioDesktop }
        : {}),
      ...(typeof paneNode.heightRatioTablet === "string"
        ? { height_ratio_tablet: paneNode.heightRatioTablet }
        : {}),
      ...(typeof paneNode.heightRatioMobile === "string"
        ? { height_ratio_mobile: paneNode.heightRatioMobile }
        : {}),
      ...(typeof paneNode.codeHookTarget === "string"
        ? { codeHookTarget: paneNode.codeHookTarget }
        : {}),
      ...(typeof paneNode.codeHookTarget === "string" &&
      typeof paneNode.codeHookPayload !== "undefined"
        ? { codeHookPayload: paneNode.codeHookPayload }
        : {}),
      ...(typeof paneNode.heldBeliefs !== "undefined" ? { heldBeliefs: paneNode.heldBeliefs } : {}),
      ...(typeof paneNode.withheldBeliefs !== "undefined"
        ? { withheldBeliefs: paneNode.withheldBeliefs }
        : {}),
    };

    // Process file relationships and create updated file records
    if (paneFilesNodes) {
      paneFilesNodes.forEach((fid: string) => {
        // Add file relationship
        saveData.paneFiles.push({
          pane_id: paneNode.id,
          file_id: fid,
        });

        // Find the TagElement with this fileId
        const tagElement = allNodes.find(
          (node) => node.nodeType === "TagElement" && "fileId" in node && node.fileId === fid
        ) as FlatNode;

        if (tagElement && "alt" in tagElement) {
          // Extract base filename from src URL by removing the _???px part
          const urlFilename = tagElement.src?.split("/").pop() || "";
          const baseFilename = urlFilename.replace(/_\d+px\./, ".");
          saveData.files.push({
            id: fid,
            filename: baseFilename || fid, // Fallback to fid if extraction fails
            alt_description: tagElement.alt || "Image description missing",
            url: tagElement.src || "",
            ...(typeof tagElement.srcSet === "string" ? { src_set: tagElement.srcSet } : {}),
          });
        }
      });
    }

    // Process markdown if present
    if (markdownNode) {
      const markdownGen = new MarkdownGenerator(ctx);
      const markdownBody = markdownGen.markdownFragmentToMarkdown(markdownNode.id);
      if (markdownBody) {
        saveData.markdowns.push({
          id: markdownNode.id,
          markdown_body: markdownBody,
        });
      }
    }

    // Create the pane record
    saveData.panes.push({
      id: paneNode.id,
      title: paneNode.title,
      slug: paneNode.slug,
      pane_type: paneType,
      ...(markdownNode ? { markdown_id: markdownNode.id } : {}),
      created: this.ensureDate(paneNode.created),
      changed: this.ensureDate(paneNode.changed),
      is_context_pane: paneNode.isContextPane ? 1 : 0,
      options_payload: JSON.stringify(optionsPayload),
    });
  }

  protected ensureDate(date: Date | string | undefined | null): string {
    if (!date) return new Date().toISOString();
    if (typeof date === "string") return date;
    return date.toISOString();
  }

  save(ctx: NodesContext): SaveData {
    const saveData: SaveData = {
      tractstacks: [],
      storyfragments: [],
      panes: [],
      markdowns: [],
      paneFiles: [],
      files: [],
      menus: [],
      resources: [],
      beliefs: [],
    };

    ctx.clearUndoHistory();
    const dirtyNodes = ctx.getDirtyNodes();
    console.log(`dirtyNodes to process`, dirtyNodes);

    // 1. Process TractStack nodes first (required by storyfragments)
    const tractStackNodes = dirtyNodes.filter(
      (node): node is TractStackNode => node.nodeType === "TractStack"
    );
    tractStackNodes.forEach((node) => {
      console.log(`Processing TractStack node:`, node);
      this.processTractStackNode(node, saveData);
    });

    // 2. Process Menu nodes (required by storyfragments)
    const menuNodes = dirtyNodes.filter((node): node is MenuNode => node.nodeType === "Menu");
    menuNodes.forEach((node) => {
      console.log(`Processing Menu node:`, node);
      this.processMenuNode(node, saveData);
    });

    // 3. Process File nodes (required by panes)
    const fileNodes = dirtyNodes.filter((node): node is ImageFileNode => node.nodeType === "File");
    fileNodes.forEach((node) => {
      console.log(`Processing File node:`, node);
      this.processImageFileNode(node, saveData);
    });

    // 4. Process Markdown nodes (part of panes)
    // Note: Markdown nodes are processed through processPaneNode
    // They don't appear directly in dirtyNodes

    // 5. Process Pane nodes
    const paneNodes = dirtyNodes.filter((node): node is PaneNode => node.nodeType === "Pane");
    paneNodes.forEach((node) => {
      console.log(`Processing Pane node:`, node);
      // Convert string dates to proper format before processing
      const processNode = {
        ...node,
        changed: this.ensureDate(node.changed),
        created: this.ensureDate(node.created),
      };
      this.processPaneNode(ctx, processNode, saveData);
    });

    // 6. Process StoryFragment nodes
    const storyFragmentNodes = dirtyNodes.filter(
      (node): node is StoryFragmentNode => node.nodeType === "StoryFragment"
    );
    storyFragmentNodes.forEach((node) => {
      console.log(`Processing StoryFragment node:`, node);
      // Convert string dates to proper format before processing
      const processNode = {
        ...node,
        changed: this.ensureDate(node.changed),
        created: this.ensureDate(node.created),
      };
      this.processStoryFragmentNode(processNode, saveData);
    });

    // 7. Process Resource nodes (no dependencies)
    const resourceNodes = dirtyNodes.filter(
      (node): node is ResourceNode => node.nodeType === "Resource"
    );
    resourceNodes.forEach((node) => {
      console.log(`Processing Resource node:`, node);
      this.processResourceNode(node, saveData);
    });

    // 8. Process Belief nodes (no dependencies)
    const beliefNodes = dirtyNodes.filter((node): node is BeliefNode => node.nodeType === "Belief");
    beliefNodes.forEach((node) => {
      console.log(`Processing Belief node:`, node);
      this.processBeliefNode(node, saveData);
    });

    console.log(saveData);
    return saveData;
  }
}
