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
import type {
  TractStackNode,
  StoryFragmentNode,
  PaneNode,
  BeliefNode,
  MenuNode,
  ImageFileNode,
  ResourceNode,
} from "@/types.ts";

export class NodesDeserializer_Json implements NodesDeserializer {
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
    const childNodes = optionsPayload.nodes || [];
    const heldBeliefs =
      typeof optionsPayload.heldBeliefs !== `undefined` ? optionsPayload.heldBeliefs : null;
    const withheldBeliefs =
      typeof optionsPayload.withheldBeliefs !== `undefined` ? optionsPayload.withheldBeliefs : null;
    if (typeof optionsPayload.nodes !== `undefined`) delete optionsPayload.nodes;
    if (typeof optionsPayload.heldBeliefs !== `undefined`) delete optionsPayload.heldBeliefs;
    if (typeof optionsPayload.withheldBeliefs !== `undefined`)
      delete optionsPayload.withheldBeliefs;
    loadData.childNodes = [
      ...(loadData?.childNodes ? [...loadData.childNodes] : []),
      ...childNodes,
    ];
    loadData.paneNodes.push({
      id: rowData.id,
      title: rowData.title,
      nodeType: `Pane`,
      slug: rowData.slug,
      parentId: null,
      isContextPane: rowData.is_context_pane ? true : false,
      ...(typeof rowData.markdown_id === `string` ? { markdownId: rowData.markdown_id } : {}),
      isDecorative:
        typeof optionsPayload.isDecorative === `boolean` ? optionsPayload.isDecorative : false,
      created:
        typeof rowData?.created === `string`
          ? new Date(rowData.created)
          : new Date(new Date().toISOString()),
      changed:
        typeof rowData?.changed === `string`
          ? new Date(rowData.changed)
          : new Date(new Date().toISOString()),
      ...(typeof optionsPayload.bgColour === `string` ? { bgColour: optionsPayload.bgColour } : {}),
      ...(heldBeliefs ? { heldBeliefs } : {}),
      ...(withheldBeliefs ? { withheldBeliefs } : {}),
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
