import type { Row } from "@libsql/client";
import type { TractStackNode } from "../../../types";

export function getTractStackNode(row: Row): TractStackNode | null {
  if (
    typeof row?.tractstack_id === `string` &&
    typeof row?.tractstack_title === `string` &&
    typeof row?.tractstack_slug === `string`
  )
    return {
      id: row.tractstack_id,
      nodeType: "Root",
      parentId: null,
      title: row.tractstack_title,
      slug: row.tractstack_slug,
      ...(typeof row.social_image_path === `string`
        ? { socialImagePath: row.social_image_path }
        : {}),
    };
  return null;
}
