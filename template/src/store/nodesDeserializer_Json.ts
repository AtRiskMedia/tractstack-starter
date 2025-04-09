import { NodesDeserializer } from "@/store/nodesSerializer.ts";
import type {
  LoadData,
  PaneRowData,
  TractStackRowData,
  MenuRowData,
  BeliefRowData,
  ImageFileRowData,
  ResourceRowData,
  StoryFragmentRowData,
} from "@/store/nodesSerializer.ts";
import { processClassesForViewports } from "@/utils/nodes/reduceNodesClassNames";
import type {
  BaseNode,
  TractStackNode,
  StoryFragmentNode,
  PaneNode,
  BeliefNode,
  MenuNode,
  ImageFileNode,
  ResourceNode,
  FlatNode,
  MarkdownPaneFragmentNode,
} from "@/types.ts";

// force regenerate the elementCss and parentCss[]
const FORCE_CSS_REGEN = true;

export class NodesDeserializer_Json implements NodesDeserializer {
  private computeElementCss(
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

  private computeParentCss(node: MarkdownPaneFragmentNode): string[] {
    if (!node.parentClasses) return [];
    const parentCssArray: string[] = [];
    node.parentClasses.forEach((layer) => {
      const [allClasses] = processClassesForViewports(layer, {}, 1);
      parentCssArray.push(allClasses[0]);
    });
    return parentCssArray;
  }

  private getClosestMarkdownAncestor(node: BaseNode, nodes: BaseNode[]): string | null {
    let current = node;
    while (current.parentId) {
      const parent = nodes.find((n) => n.id === current.parentId);
      if (!parent) break;
      if (parent.nodeType === "Markdown") {
        return parent.id;
      }
      current = parent;
    }
    return null;
  }

  processTractStackRowData(rowData: TractStackRowData | undefined, loadData: LoadData) {
    if (!rowData) return;
    if (typeof loadData.tractstackNodes === `undefined`)
      loadData.tractstackNodes = [] as TractStackNode[];
    loadData.tractstackNodes.push({
      id: rowData.id,
      nodeType: `TractStack`,
      parentId: null,
      title: rowData.title,
      slug: rowData.slug,
      ...(typeof rowData.social_image_path === `string`
        ? { socialImagePath: rowData.social_image_path }
        : {}),
    });
  }

  processStoryFragmentRowData(rowData: StoryFragmentRowData, loadData: LoadData) {
    if (!rowData) return;
    if (typeof loadData.storyfragmentNodes === `undefined`)
      loadData.storyfragmentNodes = [] as StoryFragmentNode[];
    loadData.storyfragmentNodes.push({
      id: rowData.id,
      nodeType: `StoryFragment`,
      title: rowData.title,
      slug: rowData.slug,
      paneIds: rowData.pane_ids,
      parentId: rowData.tractstack_id,
      ...(typeof rowData.tailwind_background_colour === `string`
        ? { tailwindBgColour: rowData.tailwind_background_colour }
        : {}),
      ...(typeof rowData.social_image_path === `string`
        ? { socialImagePath: rowData.social_image_path }
        : {}),
      created:
        typeof rowData?.created === `string`
          ? new Date(rowData.created)
          : new Date(new Date().toISOString()),
      changed:
        typeof rowData?.changed === `string`
          ? new Date(rowData.changed)
          : new Date(new Date().toISOString()),
      hasMenu: !!rowData.menu_id,
      ...(typeof rowData?.menu_id === `string` ? { menuId: rowData.menu_id } : {}),
    });
  }

  processBeliefRowData(rowData: BeliefRowData | undefined, loadData: LoadData) {
    if (!rowData) return;
    if (typeof loadData.beliefNodes === "undefined") loadData.beliefNodes = [] as BeliefNode[];

    loadData.beliefNodes.push({
      id: rowData.id,
      nodeType: "Belief",
      parentId: null,
      title: rowData.title,
      slug: rowData.slug,
      scale: rowData.scale,
      ...(typeof rowData.custom_values === "string"
        ? { customValues: rowData.custom_values.split(",") }
        : {}),
    });
  }

  processPaneRowData(rowData: PaneRowData | undefined, loadData: LoadData) {
    if (!rowData) return;
    if (typeof loadData.paneNodes === `undefined`) loadData.paneNodes = [] as PaneNode[];

    const optionsPayload = JSON.parse(rowData.options_payload);

    if (FORCE_CSS_REGEN && optionsPayload?.nodes) {
      const allNodes = [...optionsPayload.nodes];

      // Compute elementCss
      allNodes.forEach((node) => {
        if (node.nodeType === "TagElement" && node.parentId) {
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

      // Compute parentCss
      allNodes.forEach((node) => {
        if (node.nodeType === "Markdown") {
          const markdownNode = node as MarkdownPaneFragmentNode;
          const parentCss = this.computeParentCss(markdownNode);
          if (parentCss.length > 0) {
            markdownNode.parentCss = parentCss;
          }
        }
      });
    }

    // Process background image nodes to ensure they have full file info
    if (optionsPayload?.nodes) {
      optionsPayload.nodes.forEach((node: any) => {
        // Identify BgPane nodes with background-image type
        if (node.nodeType === "BgPane" && node.type === "background-image" && node.fileId) {
          // Ensure src and other properties are properly set
          if (!node.src && node.fileId) {
            // Look for file data in files array if available
            const fileNode = loadData.fileNodes?.find((file) => file.id === node.fileId);
            if (fileNode) {
              node.src = fileNode.src;
              if (fileNode.srcSet) node.srcSet = fileNode.srcSet;
              if (fileNode.altDescription) node.alt = fileNode.altDescription;
            }
          }

          // Ensure objectFit has a default value if not set
          if (!node.objectFit) {
            node.objectFit = "cover";
          }
        }
      });
    }

    // Extract nodes and beliefs from options payload
    const childNodes = optionsPayload?.nodes || [];
    const heldBeliefs =
      typeof optionsPayload?.heldBeliefs !== `undefined` ? optionsPayload.heldBeliefs : null;
    const withheldBeliefs =
      typeof optionsPayload?.withheldBeliefs !== `undefined`
        ? optionsPayload.withheldBeliefs
        : null;

    // Extract codeHook related fields
    const codeHookTarget =
      typeof optionsPayload?.codeHookTarget === "string" ? optionsPayload.codeHookTarget : null;
    const codeHookPayload =
      typeof optionsPayload?.codeHookPayload === "object" ? optionsPayload.codeHookPayload : null;

    // Clean up processed fields from optionsPayload
    ["nodes", "heldBeliefs", "withheldBeliefs", "codeHookTarget", "codeHookPayload"].forEach(
      (field) => {
        if (typeof optionsPayload?.[field] !== `undefined`) delete optionsPayload[field];
      }
    );

    // Update childNodes in loadData
    loadData.childNodes = [
      ...(loadData?.childNodes ? [...loadData.childNodes] : []),
      ...childNodes,
    ];

    // Build and push the pane node
    loadData.paneNodes.push({
      id: rowData.id,
      title: rowData.title,
      nodeType: `Pane`,
      slug: rowData.slug,
      parentId: null,
      isContextPane: rowData.is_context_pane ? true : false,
      ...(typeof rowData.markdown_id === `string` ? { markdownId: rowData.markdown_id } : {}),
      isDecorative:
        typeof optionsPayload?.isDecorative === `boolean` ? optionsPayload.isDecorative : false,
      created:
        typeof rowData?.created === `string`
          ? new Date(rowData.created)
          : new Date(new Date().toISOString()),
      changed:
        typeof rowData?.changed === `string`
          ? new Date(rowData.changed)
          : new Date(new Date().toISOString()),
      ...(typeof optionsPayload?.bgColour === `string`
        ? { bgColour: optionsPayload.bgColour }
        : {}),
      ...(heldBeliefs ? { heldBeliefs } : {}),
      ...(withheldBeliefs ? { withheldBeliefs } : {}),
      ...(codeHookTarget ? { codeHookTarget } : {}),
      ...(codeHookPayload ? { codeHookPayload } : {}),
    });
  }

  processMenuRowData(rowData: MenuRowData | undefined, loadData: LoadData) {
    if (!rowData) return;
    if (typeof loadData.menuNodes === `undefined`) loadData.menuNodes = [] as MenuNode[];
    loadData.menuNodes.push({
      id: rowData.id,
      nodeType: `Menu`,
      parentId: null,
      title: rowData.title,
      theme: rowData.theme,
      optionsPayload: JSON.parse(rowData.options_payload),
    });
  }

  processImageFileRowData(rowData: ImageFileRowData | undefined, loadData: LoadData) {
    if (!rowData) return;
    if (typeof loadData.fileNodes === `undefined`) loadData.fileNodes = [] as ImageFileNode[];
    loadData.fileNodes.push({
      id: rowData.id,
      parentId: null,
      filename: rowData.filename,
      nodeType: `File`,
      altDescription:
        rowData.alt_description || `We apologize this image description could not be found.`,
      src: rowData.url,
      ...(typeof rowData.src_set === `string` ? { srcSet: rowData.src_set } : {}),
    });
  }

  processResourceRowData(rowData: ResourceRowData | undefined, loadData: LoadData) {
    if (!rowData) return;
    if (typeof loadData.resourceNodes === `undefined`)
      loadData.resourceNodes = [] as ResourceNode[];
    loadData.resourceNodes.push({
      id: rowData.id,
      nodeType: `Resource`,
      parentId: null,
      title: rowData.title,
      slug: rowData.slug,
      oneliner: rowData.oneliner,
      ...(typeof rowData.action_lisp === `string` ? { actionLisp: rowData.action_lisp } : {}),
      ...(typeof rowData.category_slug === `string` ? { category: rowData.category_slug } : {}),
      optionsPayload: JSON.parse(rowData.options_payload),
    });
  }
}
