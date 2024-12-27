import type { Row } from "@libsql/client";
import type { StoryFragmentNode } from "../../../types";

export function getStoryFragmentNodes(row: Row): StoryFragmentNode | null {
  if (
    typeof row?.id === `string` &&
    typeof row?.title === `string` &&
    typeof row?.slug === `string` &&
    typeof row?.tractstack_id === `string`
  )
    return {
      id: row.id,
      nodeType: "StoryFragment",
      title: row.title,
      slug: row.slug,
      parentId: row.tractstack_id,
      ...(typeof row.social_image_path === `string`
        ? { socialImagePath: row.social_image_path }
        : {}),
      ...(typeof row?.tailwind_background_colour === `string` && row.tailwind_background_colour
        ? { tailwindBgColour: row.tailwind_background_colour }
        : {}),
      ...(typeof row?.created === `string` ? { created: new Date(row.created).getTime() } : {}),
      ...(typeof row?.changed === `string` ? { changed: new Date(row.changed).getTime() } : {}),
      hasMenu: !!row.menu_id,
      ...(typeof row?.menu_id === `string` ? { menuId: row.menu_id } : {}),
    };
  return null;
}
