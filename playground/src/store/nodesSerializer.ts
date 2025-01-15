import { NodesContext } from "@/store/nodes.ts";
import type { StoryKeepAllNodes } from "@/types.ts";

export type TractStackRowData = {
  id: string;
  title: string;
  slug: string;
  social_image_path: string | null;
};

export type StoryFragmentRowData = {
  id: string;
  title: string;
  slug: string;
  trackstack_id: string;
  created: string;
  changed: string;
  menu_id?: string;
  social_image_path?: string;
  tailwind_background_colour?: string;
};

export type FileObjectRowData = {
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
  storyfragmentId: string;
  paneId: string;
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
  files: FileObjectRowData[];
  menus: MenuRowData[];
  resources: ResourceRowData[];
  storyfragments: StoryFragmentRowData[];
  panes: PaneRowData[];
  markdowns: MarkdownRowData[];
  paneMarkdowns: PaneMarkdownRowData[];
  paneFiles: PaneFileRowData[];
  storyfragmentPanes: StoryFragmentPaneRowData[];
  tractstacks: TractStackRowData[];
};

export abstract class NodesSerializer {
  abstract save(ctx: NodesContext): SaveData;
  abstract migrateAll(ctx: NodesContext, nodes: StoryKeepAllNodes): SaveData;
}
