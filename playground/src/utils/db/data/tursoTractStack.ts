import type { Row } from "@libsql/client";
import type { TractStackDatum } from "../../../types";

export function cleanTursoTractStack(rows: Row[]): TractStackDatum[] {
  if (!rows.length) return [];

  const payload: (TractStackDatum | null)[] = rows.map((r: Row) => {
    if (typeof r?.id === `string` && typeof r?.title === `string` && typeof r?.slug === `string`)
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        socialImagePath: (typeof r.social_image_path === `string` && r.social_image_path) || ``,
      };
    return null;
  });

  return payload.filter((n): n is TractStackDatum => n !== null);
}
