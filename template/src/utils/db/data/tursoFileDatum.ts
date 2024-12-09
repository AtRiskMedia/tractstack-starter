import type { TursoFileNode, FileDatum } from "../../../types";

export function cleanTursoFileDatum(rows: TursoFileNode[]): FileDatum[] {
  if (!rows.length) return [];

  const payload: (FileDatum | null)[] = rows?.map((r: TursoFileNode) => {
    if (
      typeof r?.id === `string` &&
      typeof r?.filename === `string` &&
      typeof r?.alt_description === `string` &&
      typeof r?.url === `string` &&
      typeof r?.src_set === `boolean` &&
      typeof r?.paneId === `string` &&
      typeof r?.markdown === `boolean`
    ) {
      if (!r.src_set)
        return {
          id: r.id,
          filename: r.filename,
          altDescription: r.alt_description,
          url: r.url,
          src: `/${r.url}`,
          srcSet: false,
          paneId: r.paneId,
          markdown: r.markdown,
        } as FileDatum;
      // srcSet; must override image
      return {
        id: r.id,
        filename: r.filename,
        altDescription: r.alt_description,
        url: r.url,
        src: `/${r.url}`.replace(/(\.[^.]+)$/, "_1920px$1"),
        srcSet: false,
        paneId: r.paneId,
        markdown: r.markdown,
      } as FileDatum;
    }
    return null;
  });

  return payload.filter((n): n is FileDatum => n !== null);
}
