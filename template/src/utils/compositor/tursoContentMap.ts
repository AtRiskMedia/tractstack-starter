import type { Row } from "@libsql/client";
import type { ContentMap } from "../../types";

export function cleanTursoContentMap(storyfragments: Row[], panes: Row[]) {
  if (!storyfragments.length && !panes.length) return [];

  const _storyfragments = storyfragments
    .map((m: Row) => {
      if (
        typeof m?.id === `string` &&
        typeof m?.title === `string` &&
        typeof m?.slug === `string` &&
        typeof m?.tractstack_id === `string` &&
        typeof m?.tractstack_title === `string` &&
        typeof m?.tractstack_slug === `string` &&
        typeof m?.created === `string`
      )
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          type: `StoryFragment`,
          parentId: m.tractstack_id,
          parentTitle: m.tractstack_title,
          parentSlug: m.tractstack_slug,
          created: new Date(m.created),
          changed: (typeof m?.changed === `string` && new Date(m.changed)) || null,
          panes: (typeof m?.pane_ids === `string` && m.pane_ids.split(`,`)) || [],
        } as ContentMap;
      return null;
    })
    .filter((r): r is ContentMap => r !== null);

  const _panes = panes
    .map((m: Row) => {
      if (
        typeof m?.id === `string` &&
        typeof m?.title === `string` &&
        typeof m?.slug === `string` &&
        typeof m?.created === `string`
      )
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          type: `Pane`,
          created: new Date(m.created),
          changed: (typeof m?.changed === `string` && new Date(m.changed)) || null,
          isContextPane: m?.is_context_pane === 1,
        } as ContentMap;
      return null;
    })
    .filter((r): r is ContentMap => r !== null);

  return [..._storyfragments, ..._panes] as ContentMap[];
}
