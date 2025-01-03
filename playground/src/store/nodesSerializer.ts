import { NodesContext } from "@/store/nodes.ts";

export type TractStackRowData = {
  id: string;
  title: string;
  slug: string;
  social_image_path: string|null;
}

export type StoryFragmentRowData = {
  id: string;
  title: string;
  slug: string;
  trackstack_id: string;
  social_image_path: string|null;
  tailwind_background_colour: string;
  created: string;
  changed: string;
  menu_id: string;
  pane_ids: string[];
}

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
  created: string;
  changed: string;
  markdown_id: string;
  options_payload: string;
  is_context_pane: number;
  height_offset_desktop: number;
  height_offset_mobile: number;
  height_offset_tablet: number;
  height_ratio_desktop: string;
  height_ratio_mobile: string;
  height_ratio_tablet: string;
  markdown_body: string;
  files: string;
}

export type MenuRowData = {
  id: string;
  title: string;
  theme: string;
  options_payload: string;
}

export type ResourceRowData = {
  id: string;
  title: string;
  slug: string;
  category: string;
  actionLisp: string;
  oneliner: string;
  optionsPayload: string;
}

export type SaveData = {
  files: FileObjectRowData[];
  menus: MenuRowData[];
  resources: ResourceRowData[];

  tractStack: TractStackRowData;
  storyFragments: StoryFragmentRowData[];
  panes: PaneRowData[];
}

export abstract class NodesSerializer {
  abstract save(ctx: NodesContext): SaveData;
}
