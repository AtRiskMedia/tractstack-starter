import type { Row } from "@libsql/client";
import type { ResourceNode } from "../../../types";

export function getResourceNodes(rows: Row[]): ResourceNode[] {
  if (!rows.length) return [];

  const payload: (ResourceNode | null)[] = rows.map((r: Row) => {
    if (
      typeof r?.id === `string` &&
      typeof r?.title === `string` &&
      typeof r?.slug === `string` &&
      typeof r?.oneliner === `string`
    )
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: r?.category_slug || null,
        actionLisp: r?.action_lisp || null,
        oneliner: r.oneliner,
        optionsPayload:
          (typeof r?.options_payload === `string` && JSON.parse(r.options_payload)) || null,
      } as ResourceNode;
    return null;
  });

  return payload.filter((n): n is ResourceNode => n !== null);
}
