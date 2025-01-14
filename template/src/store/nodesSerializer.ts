import { NodesContext } from "@/store/nodes.ts";

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
  pane_ids: string[];
  menu_id?: string;
  social_image_path?: string;
  tailwind_background_colour?: string;
};

export type FileObjectRowData = {
  id: string;
  filename: string;
  alt_description: string | null;
  url: string;
  src_set: string | null;
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

export type MarkdownRowData = {
  id: string;
  markdown_body: string;
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
  category: string;
  actionLisp: string;
  oneliner: string;
  optionsPayload: string;
};

export type SaveData = {
  files: FileObjectRowData[];
  menus: MenuRowData[];
  resources: ResourceRowData[];
  storyfragments: StoryFragmentRowData[];
  panes: PaneRowData[];
  markdowns: MarkdownRowData[];
  tractstacks: TractStackRowData[];
};

export abstract class NodesSerializer {
  abstract save(ctx: NodesContext): SaveData;
}
