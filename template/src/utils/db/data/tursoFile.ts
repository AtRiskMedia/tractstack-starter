import type { Row } from "@libsql/client";
import type { TursoFileNode } from "../../../types";

export function cleanTursoFile(rows: Row[]): TursoFileNode[] {
  if (!rows.length) return [];

  const payload: (TursoFileNode | null)[] = rows?.map((r: Row) => {
    if (
      typeof r?.id === `string` &&
      typeof r?.filename === `string` &&
      typeof r?.alt_description === `string` &&
      typeof r?.src_set === `number` &&
      typeof r?.url === `string`
    )
      return {
        id: r.id,
        filename: r.filename,
        alt_description: r.alt_description,
        url: r.url,
        src_set: r.src_set === 1,
        paneId: `none`,
        markdown: false,
      } as TursoFileNode;
    return null;
  });

  return payload.filter((n): n is TursoFileNode => n !== null);
}
