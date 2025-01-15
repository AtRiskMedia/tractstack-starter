import { NodesContext } from "@/store/nodes.ts";
import type {
  BaseNode,
  StoryKeepAllNodes,
  ImageFileNode,
  MenuNode,
  ResourceNode,
  StoryFragmentNode,
  PaneNode,
  TractStackNode,
} from "@/types.ts";

export type TractStackRowData = {
  id: string;
  title: string;
  slug: string;
  social_image_path?: string;
};

export type StoryFragmentRowData = {
  id: string;
  title: string;
  slug: string;
  tractstack_id: string;
  created: string;
  changed: string;
  menu_id?: string;
  social_image_path?: string;
  tailwind_background_colour?: string;
};

export type ImageFileRowData = {
  id: string;
  filename: string;
  alt_description: string | null;
  url: string;
  src_set?: string;
};

export type PaneRowData = {
  id: string;
  title: string;
  slug: string;
  pane_type: string;
  created: string;
  changed: string;
  options_payload: string;
  is_context_pane: number;
};

export type PaneFileRowData = {
  pane_id: string;
  file_id: string;
};

export type MarkdownRowData = {
  id: string;
  markdown_body: string;
};

export type PaneMarkdownRowData = {
  paneId: string;
  markdownId: string;
};

export type StoryFragmentPaneRowData = {
  [key: string]: string[];
};

export type MenuRowData = {
  id: string;
  title: string;
  theme: string;
  options_payload: string;
};

export type ResourceRowData = {
  id: string;
  title: string;
  slug: string;
  oneliner: string;
  options_payload: string;
  category_slug?: string;
  action_lisp?: string;
};

export type SaveData = {
  files: ImageFileRowData[];
  menus: MenuRowData[];
  resources: ResourceRowData[];
  storyfragments: StoryFragmentRowData[];
  panes: PaneRowData[];
  markdowns: MarkdownRowData[];
  paneMarkdowns: PaneMarkdownRowData[];
  paneFiles: PaneFileRowData[];
  storyfragmentPanes: StoryFragmentPaneRowData;
  tractstacks: TractStackRowData[];
};
export type LoadData = {
  files: ImageFileNode[];
  menus: MenuNode[];
  resources: ResourceNode[];
  storyfragments: StoryFragmentNode[];
  panes: PaneNode[];
  tractstacks: TractStackNode[];
};

export abstract class NodesSerializer {
  abstract save(ctx: NodesContext): SaveData;
  abstract migrateAll(ctx: NodesContext, nodes: StoryKeepAllNodes): SaveData;
  abstract processResourceNode(node: BaseNode | undefined, saveData: SaveData): void;
  abstract processMenuNode(node: BaseNode | undefined, saveData: SaveData): void;
  abstract processImageFileNode(node: BaseNode | undefined, saveData: SaveData): void;
  abstract processTractStackNode(node: BaseNode | undefined, saveData: SaveData): void;
  abstract processStoryFragmentNode(node: BaseNode | undefined, saveData: SaveData): void;
  abstract processPaneNode(ctx: NodesContext, node: BaseNode | undefined, saveData: SaveData): void;
}
export abstract class NodesDeserializer {
  //abstract loadAll(ctx: NodesContext, nodes: StoryKeepAllNodes): SaveData;
  abstract processTractStackRowData(
    rowData: TractStackRowData | undefined,
    loadData: LoadData
  ): void;
  abstract processStoryFragmentRowData(
    rowData: StoryFragmentRowData,
    paneIds: string[],
    loadData: LoadData
  ): void;
  abstract processPaneRowData(rowData: PaneRowData | undefined, loadData: LoadData): void;
  abstract processMenuRowData(rowData: MenuRowData | undefined, loadData: LoadData): void;
  abstract processImageFileRowData(rowData: ImageFileRowData | undefined, loadData: LoadData): void;
  abstract processResourceRowData(rowData: ResourceRowData | undefined, loadData: LoadData): void;
}
