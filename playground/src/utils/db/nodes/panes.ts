import type { Row } from "@libsql/client";
import type {
  BeliefDatum,
  PaneNode,
  TursoPane,
  BgPaneDatum,
  BgColourDatum,
  MarkdownPaneDatum,
} from "../../../types";

export function getPaneNodes(row: Row): PaneNode[] {
  if (typeof row?.panes === `string`) {
    const panesPayloadRaw = JSON.parse(row.panes);
    if (!panesPayloadRaw) return [];
    const paneNodes = panesPayloadRaw.map((r: TursoPane) => {
      if (
        typeof r?.id === `string` &&
        typeof r?.title === `string` &&
        typeof r?.slug === `string` &&
        typeof r?.created === `string` &&
        typeof r?.options_payload === `string` &&
        typeof r?.height_offset_desktop === `number` &&
        typeof r?.height_offset_tablet === `number` &&
        typeof r?.height_offset_mobile === `number` &&
        typeof r?.height_ratio_desktop === `string` &&
        typeof r?.height_ratio_tablet === `string` &&
        typeof r?.height_ratio_mobile === `string`
      ) {
        const optionsPayload = JSON.parse(r.options_payload);
        const { target: codeHookTarget, ...codeHookPayload } = optionsPayload?.codeHook || {};
        const bgColour =
          optionsPayload?.paneFragmentsPayload?.find(
            (fragment: BgPaneDatum | BgColourDatum | MarkdownPaneDatum) =>
              fragment.type === "bgColour"
          )?.bgColour || null;

        return {
          id: r.id,
          title: r.title,
          slug: r.slug,
          parentId: row.id,
          ...(r?.height_offset_desktop != 0
            ? { heightOffsetDesktop: r?.height_offset_desktop }
            : {}),
          ...(r?.height_offset_tablet != 0 ? { heightOffsetTablet: r?.height_offset_tablet } : {}),
          ...(r?.height_offset_mobile != 0 ? { heightOffsetMobile: r?.height_offset_mobile } : {}),
          ...(r?.height_ratio_desktop != `0.00`
            ? { heightRatioDesktop: r?.height_ratio_desktop }
            : {}),
          ...(r?.height_ratio_tablet != `0.00`
            ? { heightRatioTablet: r?.height_ratio_tablet }
            : {}),
          ...(r?.height_ratio_mobile != `0.00`
            ? { heightRatioMobile: r?.height_ratio_mobile }
            : {}),
          ...(r?.is_context_pane ? { isContextPane: true } : {}),
          ...(codeHookTarget ? { codeHookTarget: codeHookTarget } : {}),
          ...(codeHookTarget && Object.keys(codeHookPayload).length
            ? { codeHookPayload: codeHookPayload }
            : {}),
          ...(optionsPayload?.heldBeliefs
            ? { heldBeliefs: optionsPayload.heldBeliefs as BeliefDatum[] }
            : ({} as BeliefDatum[])),
          ...(optionsPayload?.withheldBeliefs
            ? { withheldBeliefs: optionsPayload.withheldBeliefs as BeliefDatum[] }
            : ({} as BeliefDatum[])),
          ...(bgColour ? { bgColour: bgColour } : {}),
        } as PaneNode;
      }
    });
    return paneNodes.filter((item: PaneNode | null): item is PaneNode => item !== null);
  }
  return [];
}
