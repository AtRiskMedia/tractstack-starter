import type { Row } from "@libsql/client";
import type { ResourceDatum } from "../../../types";

export function cleanTursoResource(rows: Row[]): ResourceDatum[] {
  if (!rows.length) return [];

  const payload: (ResourceDatum | null)[] = rows.map((r: Row) => {
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
      } as ResourceDatum;
    return null;
  });

  return payload.filter((n): n is ResourceDatum => n !== null);
}
